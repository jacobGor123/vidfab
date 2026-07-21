#!/usr/bin/env tsx

/**
 * Restore CTA wrappers lost by TipTap before the blog container extensions
 * were added. Defaults to a dry run; pass --apply to write verified rows.
 */

import dotenv from 'dotenv';
import path from 'path';
import { restoreFlattenedCtaBoxes } from '../lib/blog/restore-flattened-cta';

const apply = process.argv.includes('--apply');

async function revalidateCache(slug: string): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn(`⚠️  ${slug}: CRON_SECRET 未设置，页面将在 ISR 周期内刷新。`);
    return;
  }

  const response = await fetch('https://vidfab.ai/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ paths: [`/blog/${slug}`, '/blog'] }),
  });

  if (!response.ok) {
    throw new Error(`${slug}: ISR 刷新失败 (${response.status})`);
  }
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const supabaseModule = await import('../lib/supabase');
  const { supabaseAdmin } = (supabaseModule.default ?? supabaseModule) as typeof import('../lib/supabase');
  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, updated_at, content')
    .eq('status', 'published')
    .ilike('content', '%cta-button%')
    .order('slug');

  if (error) {
    throw error;
  }

  const repairs = (posts ?? [])
    .map((post) => ({ post, result: restoreFlattenedCtaBoxes(post.content) }))
    .filter(({ result }) => result.restoredCount > 0);

  console.log(
    `${apply ? '准备修复' : '试运行'} ${repairs.length} 篇文章，共 ${repairs.reduce((sum, item) => sum + item.result.restoredCount, 0)} 个 CTA。`
  );
  for (const { post, result } of repairs) {
    console.log(`- ${post.slug}: ${result.restoredCount} 个 CTA`);
  }

  if (!apply) {
    console.log('未写入数据库。使用 --apply 执行已列出的修复。');
    return;
  }

  for (const { post, result } of repairs) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({ content: result.content })
      .eq('id', post.id)
      // Optimistic concurrency prevents overwriting a post edited after this run began.
      .eq('updated_at', post.updated_at)
      .select('id, slug, content')
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }
    if (!updated) {
      throw new Error(`${post.slug}: 文章在修复期间已更新，未写入。`);
    }
    if (!updated.content.includes('class="cta-box"')) {
      throw new Error(`${post.slug}: 写入后 CTA 容器校验失败。`);
    }

    await revalidateCache(post.slug);
    console.log(`✅ ${post.slug}: 已修复并刷新缓存`);
  }
}

main().catch((error) => {
  console.error('修复失败:', error);
  process.exit(1);
});

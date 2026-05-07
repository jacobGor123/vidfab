#!/usr/bin/env tsx
/**
 * 将数据库中所有博客文章标题/meta 里的 2025 批量替换为 2026
 * 用法: pnpm tsx scripts/update-blog-year.ts [--dry-run]
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 查出所有含 2025 的文章
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('id, slug, title, meta_title, meta_description, content')
    .or('title.ilike.%2025%,meta_title.ilike.%2025%,meta_description.ilike.%2025%,content.ilike.%2025%')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ 查询失败:', fetchError.message)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('✅ 没有找到含 2025 的文章，无需更新。')
    return
  }

  console.log(`🔍 找到 ${posts.length} 篇含 2025 的文章：\n`)

  for (const post of posts) {
    const newTitle        = post.title?.replace(/2025/g, '2026') ?? post.title
    const newMetaTitle    = post.meta_title?.replace(/2025/g, '2026') ?? post.meta_title
    const newMetaDesc     = post.meta_description?.replace(/2025/g, '2026') ?? post.meta_description
    const newContent      = post.content?.replace(/2025/g, '2026') ?? post.content

    const changed =
      newTitle !== post.title ||
      newMetaTitle !== post.meta_title ||
      newMetaDesc !== post.meta_description ||
      newContent !== post.content

    if (!changed) continue

    console.log(`  📝 [${post.slug}]`)
    if (newTitle !== post.title)
      console.log(`     title:        "${post.title}"\n               → "${newTitle}"`)
    if (newMetaTitle !== post.meta_title)
      console.log(`     meta_title:   "${post.meta_title}"\n               → "${newMetaTitle}"`)
    if (newMetaDesc !== post.meta_description)
      console.log(`     meta_desc:    更新（含 2025 → 2026）`)
    if (newContent !== post.content)
      console.log(`     content:      更新（含 2025 → 2026）`)

    if (isDryRun) continue

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        title: newTitle,
        meta_title: newMetaTitle,
        meta_description: newMetaDesc,
        content: newContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (updateError) {
      console.error(`  ❌ 更新失败 [${post.slug}]:`, updateError.message)
    } else {
      console.log(`  ✅ 已更新`)
    }
  }

  if (isDryRun) {
    console.log('\n⚠️  Dry-run 模式，未实际修改数据库。去掉 --dry-run 参数后重新执行以生效。')
  } else {
    console.log('\n✅ 全部更新完成。')

    // 清除 ISR 缓存
    const secret = process.env.CRON_SECRET
    if (secret) {
      const siteUrl = process.env.SITE_URL ?? 'https://vidfab.ai'
      const paths = ['/blog', ...posts.map(p => `/blog/${p.slug}`)]
      console.log('\n🔄 清除 ISR 缓存...')
      const res = await fetch(`${siteUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ paths }),
      })
      const result = await res.json()
      if (res.ok) {
        console.log('   ✅ ISR 缓存已清除')
      } else {
        console.warn('   ⚠️  缓存清除失败:', result)
      }
    }
  }
}

main()

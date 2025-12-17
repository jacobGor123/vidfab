#!/usr/bin/env tsx

/**
 * 根据 slug 删除文章
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function deletePostBySlug(slug: string) {
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  console.log(`\n🗑️  准备删除文章: ${slug}`)

  // 1. 查询文章
  const { data: post, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, status')
    .eq('slug', slug)
    .single()

  if (queryError || !post) {
    console.error('❌ 文章不存在')
    process.exit(1)
  }

  console.log(`\n📄 文章信息:`)
  console.log(`  → ID: ${post.id}`)
  console.log(`  → 标题: ${post.title}`)
  console.log(`  → 状态: ${post.status}`)

  // 2. 删除文章
  const { error: deleteError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .delete()
    .eq('id', post.id)

  if (deleteError) {
    console.error('❌ 删除失败:', deleteError)
    process.exit(1)
  }

  console.log('\n✅ 文章已删除!')
}

// 主函数
async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('❌ 请提供文章 slug')
    console.log('\n用法:')
    console.log('  tsx scripts/blog/delete-post-by-slug.ts <slug>')
    console.log('\n示例:')
    console.log('  tsx scripts/blog/delete-post-by-slug.ts vidfab-vs-canva-ai-video-generator-comparison-2025')
    process.exit(1)
  }

  await deletePostBySlug(slug)
}

main().catch(console.error)

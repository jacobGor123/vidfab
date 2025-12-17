/**
 * 通过 ID 删除指定文章
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'

async function main() {
  const postId = process.argv[2]

  if (!postId) {
    console.error('❌ 请提供文章 ID')
    console.log('用法: tsx scripts/blog/delete-post-by-id.ts <POST_ID>')
    process.exit(1)
  }

  console.log(`\n🗑️  删除文章: ${postId}`)

  // 1. 先查询文章信息
  const { data: post, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('*')
    .eq('id', postId)
    .single()

  if (queryError || !post) {
    console.error('❌ 文章不存在:', postId)
    process.exit(1)
  }

  console.log(`\n📝 文章信息:`)
  console.log(`  → 标题: ${post.title}`)
  console.log(`  → Slug: ${post.slug}`)
  console.log(`  → 状态: ${post.status}`)

  // 2. 删除文章
  const { error: deleteError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .delete()
    .eq('id', postId)

  if (deleteError) {
    console.error('❌ 删除失败:', deleteError)
    process.exit(1)
  }

  console.log('\n✅ 文章已删除')
}

main().catch(console.error)

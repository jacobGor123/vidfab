#!/usr/bin/env tsx

/**
 * 查询最近生成的博客文章
 * 用于检查博客生成是否成功
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  console.log('\n📊 查询最近的博客文章...\n')

  // 动态导入确保环境变量已加载
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 查询最近 5 篇文章（包括草稿和已发布）
  const { data: posts, error } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, status, content, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('📭 暂无文章')
    return
  }

  console.log(`找到 ${posts.length} 篇最近的文章:\n`)
  console.log('='.repeat(80))

  for (const post of posts) {
    const isPlaceholder = post.content.includes('(内容生成中...)')
    const statusIcon =
      post.status === 'published'
        ? '✅'
        : post.status === 'draft'
        ? isPlaceholder
          ? '❌'
          : '📝'
        : '⏰'

    const statusLabel =
      post.status === 'published'
        ? '已发布'
        : post.status === 'draft'
        ? isPlaceholder
          ? '草稿(占位符)'
          : '草稿(有内容)'
        : '预定发布'

    console.log(`\n${statusIcon} [${statusLabel}] ${post.title}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   ID: ${post.id}`)
    console.log(`   内容长度: ${post.content.length} 字符`)
    console.log(`   创建时间: ${new Date(post.created_at).toLocaleString('zh-CN')}`)
    console.log(`   更新时间: ${new Date(post.updated_at).toLocaleString('zh-CN')}`)

    if (post.status === 'published') {
      console.log(`   🌐 URL: https://vidfab.ai/blog/${post.slug}`)
    }

    console.log('\n' + '-'.repeat(80))
  }

  // 统计
  const published = posts.filter(p => p.status === 'published').length
  const drafts = posts.filter(p => p.status === 'draft').length
  const placeholders = posts.filter(
    p => p.status === 'draft' && p.content.includes('(内容生成中...)')
  ).length

  console.log(`\n📊 统计:`)
  console.log(`   已发布: ${published} 篇`)
  console.log(`   草稿: ${drafts} 篇 (其中 ${placeholders} 篇是占位符)`)
}

main().catch(console.error)

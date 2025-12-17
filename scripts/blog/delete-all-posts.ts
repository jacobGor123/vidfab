#!/usr/bin/env tsx

/**
 * 删除所有博客文章 (用于测试)
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 从命令行参数获取确认 (--confirm)
const autoConfirm = process.argv.includes('--confirm')

async function main() {
  const { getBlogPosts, deleteBlogPost } = await import('@/models/blog')

  console.log('\n🗑️  删除所有博客文章\n')

  // 查询所有文章
  const allPosts = await getBlogPosts({
    status: 'all',
    limit: 1000,
  })

  if (!allPosts || allPosts.length === 0) {
    console.log('✅ 没有找到任何文章,数据库已清空\n')
    return
  }

  console.log(`📝 找到 ${allPosts.length} 篇文章:\n`)

  allPosts.forEach((post, index) => {
    console.log(`${index + 1}. [${post.status.toUpperCase()}] ${post.title}`)
    console.log(`   → ID: ${post.id}`)
    console.log(`   → Slug: ${post.slug}`)
    console.log(`   → 创建时间: ${new Date(post.created_at).toLocaleString('zh-CN')}`)
    console.log('')
  })

  if (!autoConfirm) {
    console.log('💡 提示: 使用 --confirm 参数可以自动确认删除')
    console.log('   命令: tsx scripts/blog/delete-all-posts.ts --confirm\n')
    console.log('⚠️  跳过删除 (未使用 --confirm 参数)\n')
    return
  }

  console.log(`⚠️  即将删除所有 ${allPosts.length} 篇文章!\n`)
  console.log('🗑️  开始删除...\n')

  for (const post of allPosts) {
    console.log(`   → 删除: ${post.slug} (${post.id})`)
    const success = await deleteBlogPost(post.id)

    if (success) {
      console.log(`   ✅ 删除成功\n`)
    } else {
      console.error(`   ❌ 删除失败\n`)
    }
  }

  console.log('✅ 所有文章已删除!\n')
}

main().catch(console.error)

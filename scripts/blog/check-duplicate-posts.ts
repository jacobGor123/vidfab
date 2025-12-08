#!/usr/bin/env tsx

/**
 * 检查数据库中的重复文章
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  // 现在才导入其他模块
  const { getBlogPosts } = await import('@/models/blog')

  console.log('\n📊 检查数据库中的博客文章...\n')

  const allPosts = await getBlogPosts({
    status: 'all',
    limit: 1000,
  })

  if (!allPosts || allPosts.length === 0) {
    console.log('❌ 没有找到任何文章\n')
    return
  }

  console.log(`✅ 找到 ${allPosts.length} 篇文章\n`)

  // 按状态分组
  const statusGroups = allPosts.reduce(
    (acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log('📈 按状态统计:')
  Object.entries(statusGroups).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count} 篇`)
  })

  // 检查重复 slug
  const slugCounts = allPosts.reduce(
    (acc, post) => {
      acc[post.slug] = (acc[post.slug] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const duplicateSlugs = Object.entries(slugCounts).filter(
    ([_, count]) => count > 1
  )

  if (duplicateSlugs.length > 0) {
    console.log('\n⚠️  发现重复 slug:')
    duplicateSlugs.forEach(([slug, count]) => {
      console.log(`  - ${slug}: ${count} 次`)

      // 打印所有重复的文章详情
      const posts = allPosts.filter(p => p.slug === slug)
      posts.forEach(p => {
        console.log(`    → ID: ${p.id} | Status: ${p.status} | 创建时间: ${new Date(p.created_at).toLocaleString('zh-CN')}`)
      })
    })
  } else {
    console.log('\n✅ 没有重复 slug')
  }

  // 最近 5 篇文章
  console.log('\n📝 最近 5 篇文章:')
  allPosts.slice(0, 5).forEach(post => {
    console.log(`\n  ${post.status.toUpperCase()} | ${post.title}`)
    console.log(`  → Slug: ${post.slug}`)
    console.log(`  → ID: ${post.id}`)
    console.log(
      `  → 创建时间: ${new Date(post.created_at).toLocaleString('zh-CN')}`
    )
  })

  console.log('')
}

main().catch(console.error)

#!/usr/bin/env tsx

/**
 * 删除重复的博客文章
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 从命令行参数获取确认 (--confirm)
const autoConfirm = process.argv.includes('--confirm')

async function main() {
  const { getBlogPosts, deleteBlogPost } = await import('@/models/blog')

  console.log('\n🗑️  删除重复的博客文章\n')

  // 查询所有文章
  const allPosts = await getBlogPosts({
    status: 'all',
    limit: 1000,
  })

  if (!allPosts || allPosts.length === 0) {
    console.log('❌ 没有找到任何文章\n')
    return
  }

  console.log(`✅ 找到 ${allPosts.length} 篇文章\n`)

  // 按创建时间排序 (最新的在前面)
  const sortedPosts = allPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  console.log('📝 文章列表 (按时间倒序):\n')
  sortedPosts.forEach((post, index) => {
    console.log(
      `${index + 1}. [${post.status.toUpperCase()}] ${post.title}`
    )
    console.log(`   → ID: ${post.id}`)
    console.log(`   → Slug: ${post.slug}`)
    console.log(
      `   → 创建时间: ${new Date(post.created_at).toLocaleString('zh-CN')}`
    )
    console.log('')
  })

  // 找出重复的文章 (标题相同但 ID 不同)
  const titleGroups = sortedPosts.reduce(
    (acc, post) => {
      const normalizedTitle = post.title.toLowerCase().trim()
      if (!acc[normalizedTitle]) {
        acc[normalizedTitle] = []
      }
      acc[normalizedTitle].push(post)
      return acc
    },
    {} as Record<string, typeof sortedPosts>
  )

  const duplicates = Object.entries(titleGroups).filter(
    ([_, posts]) => posts.length > 1
  )

  if (duplicates.length === 0) {
    console.log('✅ 没有发现重复的文章标题\n')
    return
  }

  console.log(`⚠️  发现 ${duplicates.length} 组重复文章:\n`)

  for (const [title, posts] of duplicates) {
    console.log(`📄 标题: ${title}`)
    console.log(`   重复次数: ${posts.length}\n`)

    posts.forEach((post, index) => {
      console.log(`   ${index + 1}. ${post.slug}`)
      console.log(`      → ID: ${post.id}`)
      console.log(`      → Status: ${post.status}`)
      console.log(
        `      → 创建时间: ${new Date(post.created_at).toLocaleString('zh-CN')}`
      )
    })
    console.log('')

    // 保留最新的,删除旧的
    const toKeep = posts[0] // 最新的
    const toDelete = posts.slice(1) // 旧的

    console.log(`   ✅ 将保留: ${toKeep.slug} (${toKeep.id})`)
    console.log(
      `   ❌ 将删除 ${toDelete.length} 篇旧文章:\n`
    )
    toDelete.forEach(post => {
      console.log(
        `      - ${post.slug} (${post.id}) - ${new Date(post.created_at).toLocaleString('zh-CN')}`
      )
    })
    console.log('')

    if (!autoConfirm) {
      console.log('💡 提示: 使用 --confirm 参数可以自动确认删除')
      console.log('   命令: tsx scripts/blog/delete-duplicate-post.ts --confirm\n')
      console.log('⚠️  跳过删除 (未使用 --confirm 参数)\n')
      continue
    }

    if (autoConfirm) {
      console.log('\n🗑️  开始删除...\n')

      for (const post of toDelete) {
        console.log(`   → 删除: ${post.slug} (${post.id})`)
        const success = await deleteBlogPost(post.id)

        if (success) {
          console.log(`   ✅ 删除成功\n`)
        } else {
          console.error(`   ❌ 删除失败\n`)
        }
      }

      console.log('✅ 删除完成!\n')
    }
  }
}

main().catch(console.error)

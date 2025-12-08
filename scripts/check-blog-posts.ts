#!/usr/bin/env tsx

/**
 * 检查数据库中的博客文章
 * 查看最近生成的文章，验证 cron job 是否真的创建了文章
 */

// 加载环境变量
import dotenv from 'dotenv'
import path from 'path'

// 尝试加载 .env.local，如果不存在则加载 .env
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envLocalPath })
dotenv.config({ path: envPath })

import { supabaseAdmin } from '@/lib/supabase'
import type { BlogPost } from '@/models/blog'

interface QueryOptions {
  limit?: number
  status?: 'draft' | 'scheduled' | 'published' | 'all'
  hours?: number // 查询最近 N 小时的文章
}

async function checkBlogPosts(options: QueryOptions = {}) {
  const { limit = 10, status = 'all', hours } = options

  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║       检查数据库中的博客文章                          ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('')

  // 构建查询
  let query = supabaseAdmin
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  // 按状态筛选
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // 按时间筛选
  if (hours) {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hours)
    query = query.gte('created_at', cutoffTime.toISOString())
  }

  console.log('🔍 查询参数:')
  console.log(`   - 状态筛选: ${status === 'all' ? '全部' : status}`)
  console.log(`   - 数量限制: ${limit}`)
  if (hours) {
    console.log(`   - 时间范围: 最近 ${hours} 小时`)
  }
  console.log('')

  // 执行查询
  const { data: posts, error, count } = await query

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('📭 没有找到符合条件的文章')
    console.log('')
    console.log('可能的原因:')
    console.log('  1. Cron job 还没有执行过')
    console.log('  2. Cron job 执行失败（检查 Inngest Dashboard）')
    console.log('  3. 环境变量配置不正确（检查 INNGEST_EVENT_KEY）')
    console.log('')
    console.log('建议:')
    console.log('  - 查看 Inngest Dashboard: https://www.inngest.com/dashboard')
    console.log('  - 运行本地测试: ./scripts/test-cron-job.sh')
    console.log('  - 查看诊断文档: docs/cron-job-diagnostic.md')
    process.exit(0)
  }

  // 显示统计
  console.log(`✅ 找到 ${posts.length} 篇文章`)
  console.log('')
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║                   文章列表                            ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('')

  // 显示每篇文章的详情
  posts.forEach((post: BlogPost, index: number) => {
    const createdAt = new Date(post.created_at)
    const publishedAt = post.published_at ? new Date(post.published_at) : null
    const now = new Date()
    const hoursAgo = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    )
    const minutesAgo = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60)
    )

    const timeAgo =
      hoursAgo > 0 ? `${hoursAgo} 小时前` : `${minutesAgo} 分钟前`

    console.log(`📝 文章 ${index + 1}`)
    console.log(`   ID:          ${post.id}`)
    console.log(`   标题:        ${post.title}`)
    console.log(`   Slug:        ${post.slug}`)
    console.log(`   状态:        ${getStatusEmoji(post.status)} ${post.status}`)
    console.log(`   分类:        ${post.category || '无'}`)
    console.log(`   标签:        ${post.tags?.join(', ') || '无'}`)
    console.log(`   浏览量:      ${post.view_count || 0}`)
    console.log(`   创建时间:    ${createdAt.toLocaleString('zh-CN')} (${timeAgo})`)
    if (publishedAt) {
      console.log(`   发布时间:    ${publishedAt.toLocaleString('zh-CN')}`)
    }
    console.log(`   URL:         https://vidfab.ai/blog/${post.slug}`)

    // 显示摘要（前 100 个字符）
    if (post.excerpt) {
      const shortExcerpt =
        post.excerpt.length > 100
          ? post.excerpt.substring(0, 100) + '...'
          : post.excerpt
      console.log(`   摘要:        ${shortExcerpt}`)
    }

    // 显示封面图
    if (post.featured_image_url) {
      console.log(`   封面图:      ${post.featured_image_url}`)
    }

    console.log('')
  })

  // 按状态统计
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║                   统计信息                            ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('')

  const stats = {
    total: posts.length,
    published: posts.filter((p: BlogPost) => p.status === 'published').length,
    draft: posts.filter((p: BlogPost) => p.status === 'draft').length,
    scheduled: posts.filter((p: BlogPost) => p.status === 'scheduled').length,
  }

  console.log(`   总数:        ${stats.total}`)
  console.log(`   已发布:      ${stats.published}`)
  console.log(`   草稿:        ${stats.draft}`)
  console.log(`   已排期:      ${stats.scheduled}`)
  console.log('')

  // 获取全部文章总数
  const { count: totalCount } = await supabaseAdmin
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })

  if (totalCount !== null) {
    console.log(`   数据库总数:  ${totalCount}`)
    console.log('')
  }

  // 显示最近的文章创建时间
  if (posts.length > 0) {
    const latest = posts[0]
    const latestTime = new Date(latest.created_at)
    const hoursAgo = Math.floor(
      (now.getTime() - latestTime.getTime()) / (1000 * 60 * 60)
    )

    console.log('⏰ 最新文章创建时间:')
    console.log(`   ${latestTime.toLocaleString('zh-CN')}`)
    console.log(`   (${hoursAgo > 0 ? `${hoursAgo} 小时前` : '不到 1 小时前'})`)
    console.log('')
  }

  console.log('✅ 查询完成')
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'published':
      return '🟢'
    case 'draft':
      return '🟡'
    case 'scheduled':
      return '🔵'
    default:
      return '⚪'
  }
}

// 解析命令行参数
const args = process.argv.slice(2)
const options: QueryOptions = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  if (arg === '--limit' || arg === '-l') {
    options.limit = parseInt(args[++i], 10)
  } else if (arg === '--status' || arg === '-s') {
    const status = args[++i]
    if (['draft', 'scheduled', 'published', 'all'].includes(status)) {
      options.status = status as any
    }
  } else if (arg === '--hours' || arg === '-h') {
    options.hours = parseInt(args[++i], 10)
  } else if (arg === '--help') {
    console.log(`
用法: npx tsx scripts/check-blog-posts.ts [选项]

选项:
  --limit, -l <数量>     限制显示的文章数量（默认: 10）
  --status, -s <状态>    筛选文章状态: draft | scheduled | published | all（默认: all）
  --hours, -h <小时>     只显示最近 N 小时的文章
  --help                 显示帮助信息

示例:
  # 查看最近 10 篇文章
  npx tsx scripts/check-blog-posts.ts

  # 查看最近 24 小时内创建的文章
  npx tsx scripts/check-blog-posts.ts --hours 24

  # 查看最近 5 篇已发布的文章
  npx tsx scripts/check-blog-posts.ts --limit 5 --status published

  # 查看最近 48 小时内的草稿
  npx tsx scripts/check-blog-posts.ts --hours 48 --status draft
`)
    process.exit(0)
  }
}

// 运行查询
checkBlogPosts(options).catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})

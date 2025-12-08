#!/usr/bin/env node

/**
 * 直接查询 Supabase 数据库中的博客文章
 * 不依赖项目配置，直接使用环境变量
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env') })

// 验证环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必需的环境变量:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('╔═══════════════════════════════════════════════════════╗')
console.log('║       检查数据库中的博客文章                          ║')
console.log('╚═══════════════════════════════════════════════════════╝')
console.log('')

// 解析命令行参数
const args = process.argv.slice(2)
let limit = 10
let hours = null
let status = 'all'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' || args[i] === '-l') {
    limit = parseInt(args[++i], 10)
  } else if (args[i] === '--hours' || args[i] === '-h') {
    hours = parseInt(args[++i], 10)
  } else if (args[i] === '--status' || args[i] === '-s') {
    status = args[++i]
  }
}

console.log('🔍 查询参数:')
console.log(`   - 状态筛选: ${status === 'all' ? '全部' : status}`)
console.log(`   - 数量限制: ${limit}`)
if (hours) {
  console.log(`   - 时间范围: 最近 ${hours} 小时`)
}
console.log('')

try {
  // 构建查询
  let query = supabase
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

  // 执行查询
  const { data: posts, error } = await query

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
  posts.forEach((post, index) => {
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

    const getStatusEmoji = (status) => {
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

    console.log(`📝 文章 ${index + 1}`)
    console.log(`   ID:          ${post.id}`)
    console.log(`   标题:        ${post.title}`)
    console.log(`   Slug:        ${post.slug}`)
    console.log(`   状态:        ${getStatusEmoji(post.status)} ${post.status}`)
    console.log(`   分类:        ${post.category || '无'}`)
    console.log(`   标签:        ${post.tags?.join(', ') || '无'}`)
    console.log(`   浏览量:      ${post.view_count || 0}`)
    console.log(
      `   创建时间:    ${createdAt.toLocaleString('zh-CN')} (${timeAgo})`
    )
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
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
  }

  console.log(`   总数:        ${stats.total}`)
  console.log(`   已发布:      ${stats.published}`)
  console.log(`   草稿:        ${stats.draft}`)
  console.log(`   已排期:      ${stats.scheduled}`)
  console.log('')

  // 获取全部文章总数
  const { count: totalCount } = await supabase
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
    const now = new Date()
    const hoursAgo = Math.floor(
      (now.getTime() - latestTime.getTime()) / (1000 * 60 * 60)
    )

    console.log('⏰ 最新文章创建时间:')
    console.log(`   ${latestTime.toLocaleString('zh-CN')}`)
    console.log(`   (${hoursAgo > 0 ? `${hoursAgo} 小时前` : '不到 1 小时前'})`)
    console.log('')
  }

  console.log('✅ 查询完成')
} catch (error) {
  console.error('❌ 执行失败:', error)
  process.exit(1)
}

#!/usr/bin/env node

/**
 * 检查数据库中的草稿文章
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env.local')
console.log(`加载环境变量: ${envPath}`)
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '已设置' : '未设置'}`)
console.log(`SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '已设置' : '未设置'}\n`)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDrafts() {
  console.log('📊 检查博客文章状态...\n')

  // 查询所有文章
  const { data: allPosts, error: allError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, created_at')
    .order('created_at', { ascending: false })

  if (allError) {
    console.error('❌ 查询失败:', allError.message)
    return
  }

  // 统计各状态文章数量
  const statusCount = {
    draft: 0,
    published: 0,
  }

  const drafts = []
  const published = []

  for (const post of allPosts || []) {
    if (post.status === 'draft') {
      statusCount.draft++
      drafts.push(post)
    } else if (post.status === 'published') {
      statusCount.published++
      published.push(post)
    }
  }

  console.log('📈 统计结果:')
  console.log(`  - 总文章数: ${allPosts?.length || 0}`)
  console.log(`  - 已发布: ${statusCount.published}`)
  console.log(`  - 草稿: ${statusCount.draft}`)
  console.log('')

  if (drafts.length > 0) {
    console.log('📝 草稿文章列表:')
    console.log('-----------------------------------')
    drafts.forEach((post, index) => {
      console.log(
        `${index + 1}. [${post.id}] ${post.title || '(无标题)'} - ${new Date(post.created_at).toLocaleString()}`
      )
    })
    console.log('')
  }

  if (published.length > 0) {
    console.log('✅ 已发布文章列表:')
    console.log('-----------------------------------')
    published.slice(0, 5).forEach((post, index) => {
      console.log(
        `${index + 1}. [${post.id}] ${post.title} - ${new Date(post.created_at).toLocaleString()}`
      )
    })
    if (published.length > 5) {
      console.log(`   ... 还有 ${published.length - 5} 篇已发布文章`)
    }
    console.log('')
  }

  // 检查是否有重复的草稿
  if (drafts.length > 1) {
    console.log('⚠️  检测到多个草稿文章！')
    console.log('建议清理失败的草稿，保留最新的。')
    console.log('')
    console.log('清理命令:')
    console.log('  node scripts/clean-failed-drafts.mjs')
  }
}

checkDrafts()

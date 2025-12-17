#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'

async function main() {
  console.log('\n🔍 查询 AI Video Generator 相关文章...\n')

  const { data: posts, error } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, featured_image, status, created_at, views')
    .ilike('title', '%AI Video Generator%')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('❌ 未找到相关文章')
    return
  }

  console.log(`✓ 找到 ${posts.length} 篇相关文章:\n`)

  for (const post of posts) {
    console.log(`📝 ${post.title}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Status: ${post.status}`)
    console.log(`   Views: ${post.views || 0}`)
    console.log(`   Created: ${new Date(post.created_at).toLocaleDateString()}`)
    console.log(`   Featured Image: ${post.featured_image || '❌ 无图片'}`)
    console.log()
  }
}

main().catch(console.error)

#!/usr/bin/env tsx
/**
 * 修复博客文章内容中的相对路径图片
 * 删除所有 /blog/images/ 开头的无效图片标签
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'

const SLUGS_TO_FIX = [
  'best-ai-video-generator-complete-comparison-guide-2025',
  'ai-video-generator-free-online-top-tools-2025',
]

async function main() {
  console.log('\n🔧 开始修复文章内联图片...\n')

  for (const slug of SLUGS_TO_FIX) {
    console.log(`📝 处理文章: ${slug}`)

    // 1. 查询文章
    const { data: post, error: queryError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .select('*')
      .eq('slug', slug)
      .single()

    if (queryError || !post) {
      console.error(`  ❌ 文章不存在: ${slug}`)
      continue
    }

    console.log(`  → 当前状态: ${post.status}`)

    // 2. 查找相对路径图片
    const relativeImgPattern = /<img[^>]*src="\/blog\/images\/[^"]+?"[^>]*>/g
    const matches = post.content.match(relativeImgPattern)

    if (!matches || matches.length === 0) {
      console.log(`  ✓ 无需修复，未发现相对路径图片\n`)
      continue
    }

    console.log(`  → 发现 ${matches.length} 个相对路径图片`)
    matches.forEach((img, idx) => {
      const srcMatch = img.match(/src="([^"]+)"/)
      if (srcMatch) {
        console.log(`     ${idx + 1}. ${srcMatch[1]}`)
      }
    })

    // 3. 删除所有相对路径图片标签
    let fixedContent = post.content

    // 匹配并删除包含相对路径的 img 标签
    fixedContent = fixedContent.replace(relativeImgPattern, '')

    // 同时删除可能的 figure 包裹（如果图片在 figure 中）
    // 处理空的 <figure> 标签
    fixedContent = fixedContent.replace(
      /<figure[^>]*>\s*<\/figure>/g,
      ''
    )

    const removedCount = matches.length
    console.log(`  → 已删除 ${removedCount} 个无效图片标签`)

    // 4. 更新文章
    console.log(`  → 更新数据库...`)
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .update({
        content: fixedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (updateError) {
      console.error(`  ❌ 更新失败:`, updateError)
      continue
    }

    console.log(`  ✅ 文章已修复\n`)
  }

  console.log('✅ 所有文章修复完成!')
}

main().catch(console.error)

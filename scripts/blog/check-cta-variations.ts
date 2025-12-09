#!/usr/bin/env tsx

/**
 * 检查所有已发布文章中的 CTA 文案变体
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function checkCTAVariations() {
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  console.log('\n🔍 检查文章 CTA 文案...')

  const { data: posts, error } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, slug, title, content')
    .eq('status', 'published')

  if (error || !posts) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`  ✓ 找到 ${posts.length} 篇文章\n`)

  // 提取所有 CTA 框
  const ctaVariations = new Map<string, string[]>()

  for (const post of posts) {
    const ctaRegex = /<div class="cta-box">([\s\S]*?)<\/div>/g
    let match

    while ((match = ctaRegex.exec(post.content)) !== null) {
      const ctaContent = match[1].trim()

      if (!ctaVariations.has(ctaContent)) {
        ctaVariations.set(ctaContent, [])
      }
      ctaVariations.get(ctaContent)!.push(post.slug)
    }
  }

  console.log(`📊 发现 ${ctaVariations.size} 种不同的 CTA 文案:\n`)

  let index = 1
  for (const [ctaContent, slugs] of ctaVariations.entries()) {
    console.log(`${index}. 使用次数: ${slugs.length} 篇文章`)
    console.log('   文案:')
    console.log('   ' + '-'.repeat(60))
    console.log('   ' + ctaContent.replace(/\n/g, '\n   '))
    console.log('   ' + '-'.repeat(60))
    console.log(`   出现在: ${slugs.slice(0, 3).join(', ')}${slugs.length > 3 ? '...' : ''}`)
    console.log('')
    index++
  }
}

checkCTAVariations().catch(console.error)

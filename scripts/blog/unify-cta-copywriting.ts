#!/usr/bin/env tsx

/**
 * 统一所有文章的 CTA 文案
 * 将 22 种不同的 CTA 变体统一为 3 种标准模板
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 标准 CTA 模板（与 ai-content-generator.ts 和 ai-publisher.ts 保持一致）
const STANDARD_CTA_TEMPLATES = {
  'text-to-video': `<div class="cta-box">
  <h3>🎁 Try Text-to-Video for Free</h3>
  <p>Create your first AI video from text in minutes – no credit card required!</p>
  <a href="/text-to-video" class="cta-button">Start Creating Free →</a>
</div>`,

  'image-to-video': `<div class="cta-box">
  <h3>🎬 Transform Images into Videos</h3>
  <p>Upload your image and watch VidFab AI bring it to life with motion.</p>
  <a href="/image-to-video" class="cta-button">Try Image to Video →</a>
</div>`,

  'pricing': `<div class="cta-box">
  <h3>⚡ Unlock VidFab AI Pro</h3>
  <p>Get unlimited videos, advanced features, and priority support.</p>
  <a href="/pricing" class="cta-button">Upgrade to Pro →</a>
</div>`
}

async function unifyCTACopywriting(dryRun: boolean = true) {
  console.log('\n📝 开始统一 CTA 文案...')
  console.log(`  → 模式: ${dryRun ? '🔍 预览模式（不会实际修改）' : '✏️  修改模式'}`)

  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 1. 查询所有已发布文章
  console.log('\n  → 查询已发布文章...')
  const { data: posts, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, slug, title, content')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (queryError || !posts) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  console.log(`  ✓ 找到 ${posts.length} 篇已发布文章`)

  // 2. 统一每篇文章的 CTA
  const updateResults: Array<{
    id: string
    slug: string
    title: string
    changes: number
    details: string[]
  }> = []

  for (const post of posts) {
    let updatedContent = post.content
    let changeCount = 0
    const details: string[] = []

    // 提取所有 CTA 块
    const ctaRegex = /<div class="cta-box">([\s\S]*?)<\/div>/g
    let match
    const ctas: Array<{ original: string; link: string }> = []

    while ((match = ctaRegex.exec(post.content)) !== null) {
      const ctaFull = match[0]
      const ctaContent = match[1]

      // 提取链接
      const linkMatch = ctaContent.match(/href="([^"]+)"/)
      if (linkMatch) {
        ctas.push({
          original: ctaFull,
          link: linkMatch[1]
        })
      }
    }

    // 替换为标准模板
    for (const cta of ctas) {
      let standardCTA: string | null = null

      if (cta.link === '/text-to-video') {
        standardCTA = STANDARD_CTA_TEMPLATES['text-to-video']
      } else if (cta.link === '/image-to-video') {
        standardCTA = STANDARD_CTA_TEMPLATES['image-to-video']
      } else if (cta.link === '/pricing') {
        standardCTA = STANDARD_CTA_TEMPLATES['pricing']
      }

      if (standardCTA && cta.original !== standardCTA) {
        updatedContent = updatedContent.replace(cta.original, standardCTA)
        changeCount++
        details.push(`  ✓ 统一 CTA: ${cta.link}`)
      }
    }

    if (changeCount > 0) {
      updateResults.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        changes: changeCount,
        details
      })

      // 如果不是预览模式，执行更新
      if (!dryRun) {
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.BLOG_POSTS)
          .update({
            content: updatedContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)

        if (updateError) {
          console.error(`❌ 更新失败 [${post.slug}]:`, updateError)
        }
      }
    }
  }

  // 3. 输出统一报告
  console.log(`\n📊 统一报告:`)
  console.log(`  → 需要更新的文章: ${updateResults.length} 篇`)
  console.log(`  → 总共更新的 CTA: ${updateResults.reduce((sum, r) => sum + r.changes, 0)} 个`)

  if (updateResults.length > 0) {
    console.log('\n📝 修改详情:')
    for (const result of updateResults) {
      console.log(`\n  📄 ${result.title}`)
      console.log(`     Slug: ${result.slug}`)
      console.log(`     更新数量: ${result.changes} 个 CTA`)
      for (const detail of result.details) {
        console.log(`     ${detail}`)
      }
    }
  }

  if (dryRun) {
    console.log('\n⚠️  这是预览模式，没有实际修改数据')
    console.log('   如需执行统一，请运行: npm run unify-cta -- --execute')
  } else {
    console.log('\n✅ CTA 文案统一完成!')
    console.log('   所有文章现在使用 3 种标准 CTA 模板')
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute') || args.includes('-e')

  if (!executeMode) {
    console.log('\n⚠️  将以预览模式运行（不会实际修改数据）')
    console.log('   查看修改预览后，如需执行统一，请添加 --execute 参数\n')
  }

  await unifyCTACopywriting(!executeMode)
}

main().catch(console.error)

#!/usr/bin/env tsx

/**
 * 批量修复文章中的 404 CTA 链接
 * - 替换 /signup → /text-to-video
 * - 替换 /demo → /image-to-video
 * - 替换 /studio/discover → /text-to-video
 * - 统一 CTA 文案格式
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 链接替换映射
const LINK_REPLACEMENTS = [
  { from: '/signup', to: '/text-to-video' },
  { from: '/demo', to: '/image-to-video' },
  { from: '/studio/discover', to: '/text-to-video' },
]

// CTA 文案替换规则
const CTA_REPLACEMENTS = [
  {
    // 替换旧的 signup CTA
    from: /<div class="cta-box">\s*<h3>🎁 Try VidFab AI for Free<\/h3>\s*<p>Create your first AI video in minutes – no credit card required!<\/p>\s*<a href="\/signup" class="cta-button">Start Creating Free →<\/a>\s*<\/div>/gs,
    to: `<div class="cta-box">
  <h3>🎁 Try Text-to-Video for Free</h3>
  <p>Create your first AI video from text in minutes – no credit card required!</p>
  <a href="/text-to-video" class="cta-button">Start Creating Free →</a>
</div>`
  },
  {
    // 替换旧的 demo CTA
    from: /<div class="cta-box">\s*<h3>🎬 See VidFab AI in Action<\/h3>\s*<p>Watch a live demo and discover how VidFab AI transforms your ideas into videos\.<\/p>\s*<a href="\/demo" class="cta-button">Book a Demo →<\/a>\s*<\/div>/gs,
    to: `<div class="cta-box">
  <h3>🎬 Transform Images into Videos</h3>
  <p>Upload your image and watch VidFab AI bring it to life with motion.</p>
  <a href="/image-to-video" class="cta-button">Try Image to Video →</a>
</div>`
  },
]

async function fixArticleCTALinks(dryRun: boolean = true) {
  console.log('\n🔧 开始批量修复文章 CTA 链接...')
  console.log(`  → 模式: ${dryRun ? '🔍 预览模式（不会实际修改）' : '✏️  修改模式'}`)

  // 动态导入确保环境变量已加载
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 1. 查询所有已发布的文章
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

  // 2. 检查并修复每篇文章
  let needsFixCount = 0
  const fixResults: Array<{
    id: string
    slug: string
    title: string
    changes: string[]
  }> = []

  for (const post of posts) {
    const changes: string[] = []
    let fixedContent = post.content

    // 检查是否包含 404 链接
    const has404Links =
      fixedContent.includes('/signup') ||
      fixedContent.includes('/demo') ||
      fixedContent.includes('/studio/discover')

    if (!has404Links) {
      continue // 跳过不需要修复的文章
    }

    needsFixCount++

    // 替换链接
    for (const { from, to } of LINK_REPLACEMENTS) {
      const regex = new RegExp(`href="${from}"`, 'g')
      const matches = fixedContent.match(regex)

      if (matches) {
        fixedContent = fixedContent.replace(regex, `href="${to}"`)
        changes.push(`  ✓ 替换链接 ${from} → ${to} (${matches.length} 处)`)
      }
    }

    // 替换 CTA 文案
    for (const { from, to } of CTA_REPLACEMENTS) {
      if (from.test(fixedContent)) {
        fixedContent = fixedContent.replace(from, to)
        changes.push(`  ✓ 更新 CTA 文案`)
      }
    }

    if (changes.length > 0) {
      fixResults.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        changes,
      })

      // 如果不是预览模式，执行更新
      if (!dryRun) {
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.BLOG_POSTS)
          .update({
            content: fixedContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)

        if (updateError) {
          console.error(`❌ 更新失败 [${post.slug}]:`, updateError)
        }
      }
    }
  }

  // 3. 输出修复报告
  console.log(`\n📊 修复报告:`)
  console.log(`  → 需要修复的文章: ${needsFixCount} 篇`)
  console.log(`  → 已处理的文章: ${fixResults.length} 篇`)

  if (fixResults.length > 0) {
    console.log('\n📝 修改详情:')
    for (const result of fixResults) {
      console.log(`\n  📄 ${result.title}`)
      console.log(`     Slug: ${result.slug}`)
      for (const change of result.changes) {
        console.log(`     ${change}`)
      }
    }
  }

  if (dryRun) {
    console.log('\n⚠️  这是预览模式，没有实际修改数据')
    console.log('   如需执行修复，请运行: npm run fix-404-links -- --execute')
  } else {
    console.log('\n✅ 批量修复完成!')
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute') || args.includes('-e')

  if (!executeMode) {
    console.log('\n⚠️  将以预览模式运行（不会实际修改数据）')
    console.log('   查看修改预览后，如需执行修复，请添加 --execute 参数\n')
  }

  await fixArticleCTALinks(!executeMode)
}

main().catch(console.error)

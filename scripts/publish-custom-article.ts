#!/usr/bin/env tsx

/**
 * 手动发布自定义文章
 *
 * 用法：
 *   pnpm tsx scripts/publish-custom-article.ts --file discuss/blog-articles/ai-storyboard-generator-from-text.json
 *   pnpm tsx scripts/publish-custom-article.ts --file <path> --status published --author admin@vidfab.ai
 *
 * 参数：
 *   --file     必填，文章 JSON 文件路径（相对于项目根目录或绝对路径）
 *   --status   可选，draft | published，默认 draft（建议先 draft 预览）
 *   --author   可选，作者邮箱，默认 admin@vidfab.ai
 *   --site     可选，站点地址，默认读取 SITE_URL 环境变量，fallback https://vidfab.ai
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'

// 必须在所有应用模块 import 之前加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// ── 解析 CLI 参数 ──────────────────────────────────────────────────
function parseArgs(): { file: string; status: 'draft' | 'published'; author: string; site: string } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : null
  }

  const file = get('--file')
  if (!file) {
    console.error('❌ 缺少必填参数 --file')
    console.error('   用法: pnpm tsx scripts/publish-custom-article.ts --file <path>')
    process.exit(1)
  }

  const rawStatus = get('--status') ?? 'draft'
  if (rawStatus !== 'draft' && rawStatus !== 'published') {
    console.error('❌ --status 只支持 draft 或 published')
    process.exit(1)
  }

  const site =
    get('--site') ??
    process.env.SITE_URL ??
    'https://vidfab.ai'

  return {
    file,
    status: rawStatus as 'draft' | 'published',
    author: get('--author') ?? 'admin@vidfab.ai',
    site: site.replace(/\/$/, ''), // 去掉末尾斜杠
  }
}

// ── ISR 缓存清除 ────────────────────────────────────────────────────
async function revalidateCache(slug: string, siteUrl: string): Promise<void> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('\n⚠️  未检测到 CRON_SECRET 环境变量，跳过缓存清除。')
    console.warn('   如需立即生效，请在 Vercel 获取 CRON_SECRET 后重试，或等待约 1 小时 ISR 自动刷新。')
    return
  }

  const endpoint = `${siteUrl}/api/revalidate`
  const paths = [`/blog/${slug}`, '/blog']

  console.log('\n🔄 清除 ISR 缓存...')
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ paths }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn(`   ⚠️  缓存清除请求失败 (HTTP ${res.status}): ${text}`)
      return
    }

    const json = await res.json()
    if (json.success) {
      console.log(`   ✅ 已清除: ${paths.join(', ')}`)
    } else {
      console.warn(`   ⚠️  部分路径清除失败:`, json.results)
    }
  } catch (err) {
    console.warn(`   ⚠️  缓存清除请求异常（不影响发布结果）:`, err)
  }
}

// ── 主流程 ─────────────────────────────────────────────────────────
async function main() {
  const { file, status, author, site } = parseArgs()

  // 解析文件路径
  const filePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)

  console.log('📄 读取文章 JSON:', filePath)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    console.error(`❌ 文件不存在或无法读取: ${filePath}`)
    process.exit(1)
  }

  let article: any
  try {
    article = JSON.parse(raw)
  } catch (err) {
    console.error('❌ JSON 解析失败:', err)
    process.exit(1)
  }

  // 基本字段校验
  const required = ['title', 'slug', 'htmlContent', 'metaTitle', 'metaDescription', 'images']
  for (const key of required) {
    if (!article[key]) {
      console.error(`❌ 文章 JSON 缺少必填字段: ${key}`)
      process.exit(1)
    }
  }

  console.log(`\n📋 文章信息`)
  console.log(`   标题: ${article.title}`)
  console.log(`   Slug: ${article.slug}`)
  console.log(`   图片: ${article.images.length} 张（封面 ${article.images.filter((i: any) => i.usage === 'cover').length} + 内文 ${article.images.filter((i: any) => i.usage === 'inline').length}）`)
  console.log(`   状态: ${status}`)
  console.log(`   作者: ${author}`)

  console.log('\n🚀 开始发布...\n')

  // 动态 import — 确保在 dotenv.config() 之后才加载依赖环境变量的模块
  const { publishAIArticle } = await import('@/lib/blog/ai-publisher')
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 检查 slug 是否已存在（草稿），若存在则走更新路径
  const { data: existing } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id')
    .eq('slug', article.slug)
    .maybeSingle()

  if (existing) {
    console.log(`📝 检测到已有文章（ID: ${existing.id}），将更新该记录...`)
  }

  const result = await publishAIArticle(article, {
    status,
    authorEmail: author,
    existingPostId: existing?.id,
    skipBottomCTA: true, // 自定义文章已有结尾 CTA，不需要自动追加
  })

  if (result.success) {
    console.log('\n✅ 发布成功！')
    console.log(`   文章 ID : ${result.postId}`)
    console.log(`   Slug    : ${result.slug}`)
    console.log(`   预览地址 : ${site}/blog/${result.slug}`)
    if (status === 'draft') {
      console.log('\n💡 当前为草稿状态。确认内容无误后，重新运行并添加 --status published 发布正式版。')
    } else {
      await revalidateCache(result.slug, site)
    }
  } else {
    console.error('\n❌ 发布失败:', result.error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('未捕获的异常:', err)
  process.exit(1)
})

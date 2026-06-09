#!/usr/bin/env tsx

/**
 * Import prepared blog article JSON files into blog_posts without generating images.
 *
 * Usage:
 *   pnpm tsx scripts/import-blog-drafts.ts --file discuss/blog-articles/example.json
 *   pnpm tsx scripts/import-blog-drafts.ts --dir discuss/blog-articles/2026-evergreen --status draft
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

type BlogStatus = 'draft' | 'scheduled' | 'published'

interface CliArgs {
  files: string[]
  dir?: string
  status: BlogStatus
  author: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const files: string[] = []
  let dir: string | undefined
  let status: BlogStatus = 'draft'
  let author = 'admin@vidfab.ai'

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const value = args[i + 1]

    if (arg === '--file' && value) {
      files.push(value)
      i += 1
      continue
    }

    if (arg === '--dir' && value) {
      dir = value
      i += 1
      continue
    }

    if (arg === '--status' && value) {
      if (!['draft', 'scheduled', 'published'].includes(value)) {
        console.error('❌ --status 只支持 draft、scheduled 或 published')
        process.exit(1)
      }
      status = value as BlogStatus
      i += 1
      continue
    }

    if (arg === '--author' && value) {
      author = value
      i += 1
    }
  }

  if (files.length === 0 && !dir) {
    console.error('❌ 请提供 --file 或 --dir')
    process.exit(1)
  }

  return { files, dir, status, author }
}

async function collectFiles(args: CliArgs): Promise<string[]> {
  const files = [...args.files]

  if (args.dir) {
    const dirPath = path.isAbsolute(args.dir)
      ? args.dir
      : path.resolve(process.cwd(), args.dir)
    const entries = await fs.readdir(dirPath)
    files.push(
      ...entries
        .filter((entry) => entry.endsWith('.json'))
        .sort()
        .map((entry) => path.join(dirPath, entry))
    )
  }

  return files.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
  )
}

function calculateReadTime(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]*>/g, ' ')
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(wordCount / 200) || 1
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : null
}

function normalizeHtmlContent(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join('\n')
  }

  return typeof value === 'string' ? value : ''
}

async function main() {
  const args = parseArgs()
  const files = await collectFiles(args)

  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')
  const { addHeadingIds } = await import('@/lib/blog/toc')

  const { data: author, error: authorError } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('uuid')
    .eq('email', args.author)
    .maybeSingle()

  if (authorError) {
    console.warn(`⚠️  作者查询失败，将不关联作者: ${authorError.message}`)
  }

  let created = 0
  let updated = 0

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf-8')
    const article = JSON.parse(raw)

    const required = ['title', 'slug', 'htmlContent', 'excerpt', 'metaTitle', 'metaDescription']
    for (const key of required) {
      if (!article[key]) {
        throw new Error(`${filePath} 缺少必填字段: ${key}`)
      }
    }

    const content = addHeadingIds(normalizeHtmlContent(article.htmlContent))
    const featuredImageUrl =
      article.featuredImageUrl ||
      article.featured_image_url ||
      article.images?.find((image: any) => image?.usage === 'cover' && image?.url)?.url ||
      null

    const postData = {
      title: article.title,
      slug: article.slug,
      content,
      excerpt: article.excerpt,
      featured_image_url: featuredImageUrl,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      keywords: normalizeStringArray(article.keywords),
      category: article.category || 'guide',
      tags: normalizeStringArray(article.tags),
      status: args.status,
      scheduled_at: null,
      published_at: args.status === 'published' ? new Date().toISOString() : null,
      read_time_minutes: calculateReadTime(content),
      table_of_contents: null,
      faq_schema: Array.isArray(article.faqSchema) ? article.faqSchema : null,
      author_uuid: author?.uuid || null,
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .select('id')
      .eq('slug', article.slug)
      .maybeSingle()

    if (existingError) {
      throw new Error(`检查 slug 失败 (${article.slug}): ${existingError.message}`)
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from(TABLES.BLOG_POSTS)
        .update(postData as any)
        .eq('id', existing.id)

      if (error) {
        throw new Error(`更新失败 (${article.slug}): ${error.message}`)
      }

      updated += 1
      console.log(`📝 updated ${article.slug}`)
    } else {
      const { error } = await supabaseAdmin
        .from(TABLES.BLOG_POSTS)
        .insert(postData as any)

      if (error) {
        throw new Error(`创建失败 (${article.slug}): ${error.message}`)
      }

      created += 1
      console.log(`➕ created ${article.slug}`)
    }
  }

  console.log(`\n✅ import complete: ${created} created, ${updated} updated, status=${args.status}`)
}

main().catch((error) => {
  console.error('❌ import failed:', error)
  process.exit(1)
})

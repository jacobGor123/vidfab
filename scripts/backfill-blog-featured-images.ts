#!/usr/bin/env tsx

/**
 * Backfill featured images for prepared blog draft JSON files.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-blog-featured-images.ts --dir discuss/blog-articles/2026-evergreen
 *   pnpm tsx scripts/backfill-blog-featured-images.ts --dir discuss/blog-articles/2026-evergreen --force
 */

import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

type Args = {
  dir: string
  force: boolean
  dryRun: boolean
  provider: 'wavespeed' | 'local'
}

type ArticleJson = {
  title: string
  slug: string
  category?: string
  images?: Array<Record<string, any>>
  featured_image_url?: string
  [key: string]: any
}

const COVER_PROMPTS: Record<string, string> = {
  'ai-video-generator-for-beginners':
    '16:9 editorial blog cover for an AI video beginner guide: a clean modern creator desk, laptop showing abstract storyboard thumbnails, a vertical phone preview, soft cinematic purple and cyan lighting, premium SaaS aesthetic, realistic but slightly stylized, no readable text, no logos, no watermark.',
  'best-ai-video-generator-tools':
    '16:9 editorial blog cover for a comparison of AI video generator tools: multiple floating video creation panels and model cards on a sleek workstation, cinematic clips represented as abstract thumbnails, balanced neutral lighting with purple and teal accents, polished SaaS product photography style, no readable text, no logos, no watermark.',
  'free-ai-video-generator-tools':
    '16:9 editorial blog cover for free AI video generator tools: a compact creator setup with a laptop, simple storyboard cards, video timeline blocks, and a starter toolkit mood, bright clean modern lighting, accessible and practical, premium tech blog style, no readable text, no logos, no watermark.',
  'ai-video-workflow-without-editing-skills':
    '16:9 editorial blog cover for a no-editing AI video workflow: a simplified visual pipeline from script cards to storyboard frames to final video preview, one focused creator reviewing the flow on a laptop, clean modern studio, purple and blue ambient accents, no readable text, no logos, no watermark.',
  'ai-video-generator-for-youtube-and-tiktok':
    '16:9 editorial blog cover for AI videos for short-form social channels: vertical video previews floating around a creator workstation, phone and laptop screens with abstract motion thumbnails, energetic but professional lighting, no platform logos, no readable text, no watermark.',
  'ai-video-generator-no-watermark':
    '16:9 editorial blog cover for watermark-free AI video exports: a polished final video preview on a laptop with clean empty corners, export-ready frames, premium creator studio mood, crisp lighting, subtle purple and silver accents, no readable text, no logos, no watermark.',
  'how-to-write-ai-video-script-and-prompts':
    '16:9 editorial blog cover for writing AI video scripts and prompts: script note cards transforming into storyboard frames and cinematic thumbnails on a desk, clean writing workspace, pencil, keyboard, soft studio light, high-end tech blog aesthetic, no readable text, no logos, no watermark.',
  'what-is-an-ai-video-generator':
    '16:9 editorial blog cover explaining what an AI video generator is: abstract AI engine converting simple prompt cards into a sequence of cinematic video frames, modern browser-based creative tool vibe, clean dark glass interface, purple and cyan highlights, no readable text, no logos, no watermark.',
}

const COVER_THEMES: Record<string, { label: string; accent: string; secondary: string; dark: string }> = {
  'ai-video-generator-for-beginners': {
    label: 'Beginner Workflow',
    accent: '#8b5cf6',
    secondary: '#22d3ee',
    dark: '#111827',
  },
  'best-ai-video-generator-tools': {
    label: 'Tool Comparison',
    accent: '#14b8a6',
    secondary: '#a78bfa',
    dark: '#0f172a',
  },
  'free-ai-video-generator-tools': {
    label: 'Free Tools',
    accent: '#38bdf8',
    secondary: '#f59e0b',
    dark: '#10202e',
  },
  'ai-video-workflow-without-editing-skills': {
    label: 'No-Edit Workflow',
    accent: '#ec4899',
    secondary: '#60a5fa',
    dark: '#1f1532',
  },
  'ai-video-generator-for-youtube-and-tiktok': {
    label: 'Short-Form Video',
    accent: '#f97316',
    secondary: '#06b6d4',
    dark: '#18181b',
  },
  'ai-video-generator-no-watermark': {
    label: 'Clean Export',
    accent: '#f8fafc',
    secondary: '#8b5cf6',
    dark: '#111827',
  },
  'how-to-write-ai-video-script-and-prompts': {
    label: 'Scripts & Prompts',
    accent: '#facc15',
    secondary: '#8b5cf6',
    dark: '#1e1b4b',
  },
  'what-is-an-ai-video-generator': {
    label: 'AI Video Basics',
    accent: '#34d399',
    secondary: '#818cf8',
    dark: '#052e2b',
  },
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const index = args.indexOf(flag)
    return index === -1 ? null : args[index + 1]
  }

  const dir = get('--dir')
  if (!dir) {
    console.error('Missing required --dir')
    process.exit(1)
  }

  return {
    dir: path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir),
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    provider: get('--provider') === 'local' ? 'local' : 'wavespeed',
  }
}

async function readArticles(dir: string): Promise<Array<{ filePath: string; article: ArticleJson }>> {
  const files = (await fs.readdir(dir))
    .filter((file) => file.endsWith('.json'))
    .sort()

  const articles = []
  for (const file of files) {
    const filePath = path.join(dir, file)
    const article = JSON.parse(await fs.readFile(filePath, 'utf8')) as ArticleJson

    if (!article.title || !article.slug) {
      throw new Error(`${file} is missing title or slug`)
    }

    articles.push({ filePath, article })
  }

  return articles
}

function updateArticleJson(article: ArticleJson, imageUrl: string, prompt: string): ArticleJson {
  const coverImage = {
    filename: `${article.slug}-cover.jpg`,
    prompt,
    aspect_ratio: '16:9',
    output_format: 'jpg',
    usage: 'cover',
    alt: article.title,
    url: imageUrl,
  }

  const existingImages = Array.isArray(article.images) ? article.images : []
  const nonCoverImages = existingImages.filter((image) => image?.usage !== 'cover')

  return {
    ...article,
    featured_image_url: imageUrl,
    images: [coverImage, ...nonCoverImages],
  }
}

async function writeArticleJson(filePath: string, article: ArticleJson) {
  await fs.writeFile(filePath, `${JSON.stringify(article, null, 2)}\n`, 'utf8')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(value: string, maxLength: number): string[] {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxLength && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }

  if (line) {
    lines.push(line)
  }

  return lines.slice(0, 4)
}

function buildLocalCoverSvg(article: ArticleJson): string {
  const theme = COVER_THEMES[article.slug]
  const titleLines = wrapText(article.title, 30)
  const escapedTitle = titleLines
    .map((line, index) => `<tspan x="112" dy="${index === 0 ? 0 : 76}">${escapeXml(line)}</tspan>`)
    .join('')

  return `<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.dark}"/>
      <stop offset="54%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.secondary}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="30" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#grid)"/>
  <circle cx="1325" cy="150" r="260" fill="${theme.accent}" opacity="0.16"/>
  <circle cx="1115" cy="760" r="340" fill="${theme.secondary}" opacity="0.13"/>
  <rect x="70" y="64" width="1460" height="772" rx="44" fill="#ffffff" opacity="0.035" stroke="#ffffff" stroke-opacity="0.08"/>

  <g transform="translate(930 150)" filter="url(#softShadow)">
    <rect x="0" y="0" width="430" height="270" rx="26" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.14"/>
    <rect x="34" y="36" width="362" height="34" rx="17" fill="#ffffff" opacity="0.10"/>
    <rect x="34" y="96" width="160" height="104" rx="18" fill="url(#accent)" opacity="0.82"/>
    <rect x="220" y="96" width="176" height="104" rx="18" fill="#ffffff" opacity="0.09"/>
    <path d="M248 164 L290 128 L332 162 L366 132" fill="none" stroke="${theme.secondary}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <circle cx="84" cy="148" r="32" fill="#ffffff" opacity="0.22"/>
    <path d="M122 128 L162 148 L122 168 Z" fill="#ffffff" opacity="0.72"/>
  </g>

  <g transform="translate(1088 466)" filter="url(#softShadow)">
    <rect x="0" y="0" width="230" height="336" rx="34" fill="#050816" stroke="#ffffff" stroke-opacity="0.16"/>
    <rect x="28" y="36" width="174" height="240" rx="22" fill="#111827"/>
    <rect x="46" y="58" width="138" height="74" rx="16" fill="${theme.accent}" opacity="0.72"/>
    <rect x="46" y="152" width="138" height="34" rx="14" fill="#ffffff" opacity="0.13"/>
    <rect x="46" y="202" width="94" height="34" rx="14" fill="${theme.secondary}" opacity="0.46"/>
    <circle cx="115" cy="304" r="12" fill="#ffffff" opacity="0.35"/>
  </g>

  <g transform="translate(780 530)" opacity="0.92">
    <rect x="0" y="0" width="122" height="76" rx="18" fill="#ffffff" opacity="0.10"/>
    <rect x="150" y="0" width="122" height="76" rx="18" fill="#ffffff" opacity="0.10"/>
    <rect x="300" y="0" width="122" height="76" rx="18" fill="#ffffff" opacity="0.10"/>
    <path d="M122 38 H150 M272 38 H300" stroke="${theme.secondary}" stroke-width="6" stroke-linecap="round" opacity="0.82"/>
    <circle cx="61" cy="38" r="18" fill="${theme.accent}" opacity="0.88"/>
    <circle cx="211" cy="38" r="18" fill="${theme.secondary}" opacity="0.82"/>
    <circle cx="361" cy="38" r="18" fill="${theme.accent}" opacity="0.72"/>
  </g>

  <g>
    <rect x="112" y="118" width="236" height="44" rx="22" fill="url(#accent)" opacity="0.18" stroke="${theme.accent}" stroke-opacity="0.35"/>
    <text x="134" y="147" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff" opacity="0.9">${escapeXml(theme.label)}</text>
    <text x="112" y="272" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="800" fill="#ffffff" letter-spacing="0">${escapedTitle}</text>
    <rect x="112" y="662" width="116" height="8" rx="4" fill="${theme.accent}"/>
    <text x="112" y="730" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#d1d5db">VidFab AI Video Guide</text>
  </g>
</svg>`
}

async function generateLocalCover(article: ArticleJson): Promise<{ localPath: string; filename: string }> {
  const outDir = path.resolve(process.cwd(), 'tmp', 'blog-images')
  await fs.mkdir(outDir, { recursive: true })

  const filename = `${article.slug}-cover.jpg`
  const localPath = path.join(outDir, filename)

  await sharp(Buffer.from(buildLocalCoverSvg(article)))
    .jpeg({ quality: 92, progressive: true })
    .toFile(localPath)

  return { localPath, filename }
}

async function main() {
  const args = parseArgs()

  const articles = await readArticles(args.dir)
  if (articles.length === 0) {
    console.log(`No article JSON files found in ${args.dir}`)
    return
  }

  const missingPrompt = articles.filter(({ article }) => !COVER_PROMPTS[article.slug])
  if (missingPrompt.length > 0) {
    throw new Error(`Missing cover prompts for: ${missingPrompt.map(({ article }) => article.slug).join(', ')}`)
  }

  console.log(`Found ${articles.length} article files`)
  console.log(`Mode: ${args.dryRun ? 'dry-run' : args.force ? 'force' : 'skip-existing'}`)
  console.log(`Provider: ${args.provider}`)

  if (args.dryRun) {
    for (const { article } of articles) {
      console.log(`- ${article.slug}: ${COVER_PROMPTS[article.slug].slice(0, 90)}...`)
    }
    return
  }

  const { uploadBlogImage } = await import('@/lib/blog/supabase-storage-uploader')
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')
  const imageGenerator =
    args.provider === 'wavespeed'
      ? await import('@/lib/blog/wavespeed-image-generator')
      : null

  for (let index = 0; index < articles.length; index++) {
    const { filePath, article } = articles[index]
    const prompt = COVER_PROMPTS[article.slug]

    console.log(`\n[${index + 1}/${articles.length}] ${article.slug}`)

    const { data: post, error: queryError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .select('id, slug, status, featured_image_url')
      .eq('slug', article.slug)
      .maybeSingle()

    if (queryError) {
      throw new Error(`Failed to query blog post ${article.slug}: ${queryError.message}`)
    }

    if (!post) {
      console.warn(`  Skipping: no blog_posts row found`)
      continue
    }

    if (post.featured_image_url && !args.force) {
      console.log(`  Skipping: featured image already exists`)
      const syncedArticle = updateArticleJson(article, post.featured_image_url, prompt)
      await writeArticleJson(filePath, syncedArticle)
      continue
    }

    const generatedImage =
      args.provider === 'wavespeed'
        ? await imageGenerator!.generateBlogImage({
            prompt,
            aspectRatio: '16:9',
          })
        : await generateLocalCover(article)

    const uploadedImage = await uploadBlogImage({
      localPath: generatedImage.localPath,
      filename: generatedImage.filename,
      slug: article.slug,
    })

    try {
      await fs.unlink(generatedImage.localPath)
    } catch (error) {
      console.warn(`  Failed to remove temp image: ${error instanceof Error ? error.message : String(error)}`)
    }

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .update({
        featured_image_url: uploadedImage.url,
      } as any)
      .eq('id', post.id)

    if (updateError) {
      throw new Error(`Failed to update blog post ${article.slug}: ${updateError.message}`)
    }

    const updatedArticle = updateArticleJson(article, uploadedImage.url, prompt)
    await writeArticleJson(filePath, updatedArticle)

    console.log(`  Updated featured image: ${uploadedImage.url}`)
  }

  console.log('\nDone')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

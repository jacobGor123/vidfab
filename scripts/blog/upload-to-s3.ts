#!/usr/bin/env tsx

/**
 * 博客图片 S3 上传脚本
 * 上传博客图片到 AWS S3
 *
 * 使用方法:
 *   tsx scripts/blog/upload-to-s3.ts <file-path> --slug my-article
 *   tsx scripts/blog/upload-to-s3.ts --all --slug my-article
 */

import { uploadToS3, uploadBlogImages } from '@/lib/blog/s3-uploader'
import fs from 'fs/promises'
import path from 'path'

interface Args {
  filePath?: string
  slug?: string
  all?: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = {}

  if (args[0] === '--help' || args[0] === '-h') {
    showHelp()
    process.exit(0)
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--slug' && args[i + 1]) {
      result.slug = args[i + 1]
      i++
    } else if (arg === '--all') {
      result.all = true
    } else if (!arg.startsWith('--')) {
      result.filePath = arg
    }
  }

  return result
}

function showHelp() {
  console.log(`
博客图片 S3 上传脚本

使用方法:
  tsx scripts/blog/upload-to-s3.ts <file-path> --slug <article-slug>
  tsx scripts/blog/upload-to-s3.ts --all --slug <article-slug>

参数:
  <file-path>        单个文件路径
  --slug             文章 slug (必需)
  --all              上传所有压缩后的图片 (原图+缩略图+WebP)
  --help, -h         显示此帮助信息

示例:
  # 上传单个文件
  tsx scripts/blog/upload-to-s3.ts tmp/blog-images/compressed/image.jpg --slug my-article

  # 上传所有压缩后的图片
  tsx scripts/blog/upload-to-s3.ts --all --slug getting-started

上传路径格式:
  public/blog/{year}/{month}/{slug}-{timestamp}.{ext}

CDN URL:
  https://static.vidfab.ai/public/blog/...
`)
}

async function main() {
  const args = parseArgs()

  if (!args.slug) {
    console.error('❌ Error: --slug is required')
    console.log('\nUse --help for usage information')
    process.exit(1)
  }

  if (args.all) {
    // 上传所有压缩后的图片
    await uploadAllImages(args.slug)
  } else if (args.filePath) {
    // 上传单个文件
    await uploadSingleFile(args.filePath, args.slug)
  } else {
    console.error('❌ Error: Please provide a file path or use --all')
    console.log('\nUse --help for usage information')
    process.exit(1)
  }
}

async function uploadSingleFile(filePath: string, slug: string) {
  // 检查文件是否存在
  try {
    await fs.access(filePath)
  } catch (error) {
    console.error(`❌ Error: File not found: ${filePath}`)
    process.exit(1)
  }

  console.log('\n📤 Uploading single file to S3...\n')
  console.log('📂 File:', filePath)
  console.log('🏷️  Slug:', slug)

  try {
    // 生成 S3 路径
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()
    const ext = path.extname(filePath)
    const s3Key = `public/blog/${year}/${month}/${slug}-${timestamp}${ext}`

    // 确定 Content-Type
    const contentType = ext === '.webp' ? 'image/webp' : 'image/jpeg'

    const result = await uploadToS3(filePath, s3Key, contentType)

    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }

    console.log('\n✅ Upload complete!\n')
    console.log('🌐 CDN URL:', result.url)
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Upload failed:', error)
    process.exit(1)
  }
}

async function uploadAllImages(slug: string) {
  const compressedDir = path.join(process.cwd(), 'tmp', 'blog-images', 'compressed')

  // 查找最新的压缩图片
  try {
    const files = await fs.readdir(compressedDir)

    if (files.length === 0) {
      console.error('❌ Error: No compressed images found in tmp/blog-images/compressed/')
      console.log('\nPlease run compress-image.ts first')
      process.exit(1)
    }

    // 找到最新的一组图片 (根据文件名前缀)
    const latestPrefix = files
      .filter(f => f.includes('-original.jpg'))
      .sort()
      .pop()
      ?.replace('-original.jpg', '')

    if (!latestPrefix) {
      console.error('❌ Error: No valid compressed images found')
      process.exit(1)
    }

    const originalPath = path.join(compressedDir, `${latestPrefix}-original.jpg`)
    const thumbnailPath = path.join(compressedDir, `${latestPrefix}-thumb.jpg`)
    const webpPath = path.join(compressedDir, `${latestPrefix}.webp`)

    // 验证所有文件存在
    await Promise.all([
      fs.access(originalPath),
      fs.access(thumbnailPath),
      fs.access(webpPath),
    ])

    console.log('\n📤 Uploading all blog images to S3...\n')
    console.log('🏷️  Slug:', slug)
    console.log('📂 Files:')
    console.log('  -', originalPath)
    console.log('  -', thumbnailPath)
    console.log('  -', webpPath)

    const result = await uploadBlogImages(
      originalPath,
      thumbnailPath,
      webpPath,
      slug
    )

    console.log('\n✅ All uploads complete!\n')
    console.log('🌐 CDN URLs:')
    console.log('  📸 Original:', result.original)
    console.log('  🖼️  Thumbnail:', result.thumbnail)
    console.log('  🌐 WebP:', result.webp)
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Upload failed:', error)
    process.exit(1)
  }
}

main()

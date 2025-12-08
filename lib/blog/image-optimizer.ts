/**
 * 博客图片压缩优化服务
 * 使用 Sharp 生成多种尺寸和格式的图片
 */

import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

// Vercel Serverless Functions 只能写入 /tmp 目录
const COMPRESSED_DIR =
  process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? '/tmp/blog-images/compressed'
    : path.join(process.cwd(), 'tmp', 'blog-images', 'compressed')

export interface OptimizedImages {
  original: string      // 1200x630 JPEG (85%)
  thumbnail: string     // 600x315 JPEG (80%)
  webp: string         // 1200x630 WebP (80%)
}

/**
 * 压缩和优化博客图片
 * 生成多种尺寸和格式
 * @param inputPath 原始图片路径
 * @returns 压缩后的图片路径
 */
export async function optimizeBlogImage(inputPath: string): Promise<OptimizedImages> {
  try {
    // 确保压缩目录存在
    await fs.mkdir(COMPRESSED_DIR, { recursive: true })

    // 获取基础文件名 (不含扩展名)
    const basename = path.basename(inputPath, path.extname(inputPath))

    // 输出路径
    const originalPath = path.join(COMPRESSED_DIR, `${basename}-original.jpg`)
    const thumbnailPath = path.join(COMPRESSED_DIR, `${basename}-thumb.jpg`)
    const webpPath = path.join(COMPRESSED_DIR, `${basename}.webp`)

    console.log('🔧 Optimizing blog image:', inputPath)

    // 原图压缩 (1200x630, JPEG 85%)
    console.log('  📸 Generating original (1200x630, JPEG 85%)...')
    await sharp(inputPath)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toFile(originalPath)

    // 缩略图 (600x315, JPEG 80%)
    console.log('  🖼️  Generating thumbnail (600x315, JPEG 80%)...')
    await sharp(inputPath)
      .resize(600, 315, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath)

    // WebP 格式 (1200x630, 80%)
    console.log('  🌐 Generating WebP (1200x630, 80%)...')
    await sharp(inputPath)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(webpPath)

    // 获取文件大小
    const originalStats = await fs.stat(originalPath)
    const thumbnailStats = await fs.stat(thumbnailPath)
    const webpStats = await fs.stat(webpPath)

    console.log('✅ Image optimization complete:')
    console.log(`  📦 Original: ${(originalStats.size / 1024).toFixed(2)} KB`)
    console.log(`  📦 Thumbnail: ${(thumbnailStats.size / 1024).toFixed(2)} KB`)
    console.log(`  📦 WebP: ${(webpStats.size / 1024).toFixed(2)} KB`)

    return {
      original: originalPath,
      thumbnail: thumbnailPath,
      webp: webpPath,
    }
  } catch (error) {
    console.error('❌ Image optimization failed:', error)
    throw error
  }
}

/**
 * 清理压缩目录中的旧文件
 */
export async function cleanupCompressedImages(): Promise<void> {
  try {
    const files = await fs.readdir(COMPRESSED_DIR)
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000

    for (const file of files) {
      const filePath = path.join(COMPRESSED_DIR, file)
      const stats = await fs.stat(filePath)

      // 删除超过 1 小时的压缩文件
      if (now - stats.mtimeMs > ONE_HOUR) {
        await fs.unlink(filePath)
        console.log(`🗑️  Cleaned up old compressed file: ${file}`)
      }
    }
  } catch (error) {
    console.error('⚠️  Failed to cleanup compressed images:', error)
  }
}

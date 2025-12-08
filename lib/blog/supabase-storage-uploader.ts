/**
 * Supabase Storage 博客图片上传服务
 * 使用 Supabase Storage 替代 AWS S3 存储博客图片
 */

import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { VideoStorageManager, STORAGE_CONFIG } from '@/lib/storage'
import { supabaseAdmin } from '@/lib/supabase'

// 博客图片专用 bucket (使用现有的 user-images bucket，统一管理)
const BLOG_IMAGES_BUCKET = STORAGE_CONFIG.buckets.images
const BLOG_SYSTEM_USER_ID = 'blog-system' // 博客系统专用用户ID

export interface ImageUploadOptions {
  localPath: string
  filename: string
  slug: string
}

export interface UploadedImage {
  url: string
  path: string
  thumbnail: string
  webp: string
}

/**
 * 上传博客图片到 Supabase Storage
 * @param options 图片上传选项
 * @returns 上传后的图片 URLs
 */
export async function uploadBlogImage(
  options: ImageUploadOptions
): Promise<UploadedImage> {
  const { localPath, filename, slug } = options

  console.log('📤 上传博客图片到 Supabase Storage:', {
    filename,
    slug,
    localPath: localPath.substring(0, 50) + '...',
  })

  try {
    // 1. 读取本地文件
    const imageBuffer = await fs.readFile(localPath)
    const fileSize = imageBuffer.length
    console.log(`  → 原始图片大小: ${(fileSize / 1024).toFixed(2)} KB`)

    // 2. 压缩图片（保持原图质量，但优化大小）
    console.log('  → 压缩图片...')
    const compressedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    console.log(
      `  → 压缩后大小: ${(compressedBuffer.length / 1024).toFixed(2)} KB`
    )

    // 3. 生成缩略图 (800x450, 16:9 比例)
    console.log('  → 生成缩略图...')
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(800, 450, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer()

    console.log(
      `  → 缩略图大小: ${(thumbnailBuffer.length / 1024).toFixed(2)} KB`
    )

    // 4. 生成 WebP 格式（更小的文件大小）
    console.log('  → 生成 WebP 格式...')
    const webpBuffer = await sharp(imageBuffer)
      .webp({ quality: 80 })
      .toBuffer()

    console.log(`  → WebP 大小: ${(webpBuffer.length / 1024).toFixed(2)} KB`)

    // 5. 上传原图到 Supabase Storage
    console.log('  → 上传原图到 Supabase Storage...')
    const imageId = `blog-${slug}-${Date.now()}`
    const uploadResult = await VideoStorageManager.uploadImage(
      BLOG_SYSTEM_USER_ID,
      imageId,
      compressedBuffer,
      'image/jpeg'
    )

    console.log(`  ✓ 原图上传成功: ${uploadResult.path}`)

    // 6. 上传缩略图
    console.log('  → 上传缩略图...')
    const thumbnailId = `${imageId}-thumb`
    const thumbnailResult = await VideoStorageManager.uploadImage(
      BLOG_SYSTEM_USER_ID,
      thumbnailId,
      thumbnailBuffer,
      'image/jpeg'
    )

    console.log(`  ✓ 缩略图上传成功: ${thumbnailResult.path}`)

    // 7. 上传 WebP 格式
    console.log('  → 上传 WebP 格式...')
    const webpId = `${imageId}-webp`
    const webpResult = await VideoStorageManager.uploadImage(
      BLOG_SYSTEM_USER_ID,
      webpId,
      webpBuffer,
      'image/webp'
    )

    console.log(`  ✓ WebP 上传成功: ${webpResult.path}`)

    // 8. 返回所有 URLs
    const result = {
      url: uploadResult.url,
      path: uploadResult.path,
      thumbnail: thumbnailResult.url,
      webp: webpResult.url,
    }

    console.log('✅ 博客图片上传完成!')
    console.log('  → 原图 URL:', result.url)
    console.log('  → 缩略图 URL:', result.thumbnail)
    console.log('  → WebP URL:', result.webp)

    return result
  } catch (error: any) {
    console.error('❌ 博客图片上传失败:', error)
    throw error
  }
}

/**
 * 批量上传博客图片
 * @param images 图片数组
 * @returns 上传后的图片 URLs 数组
 */
export async function uploadBlogImages(
  images: ImageUploadOptions[]
): Promise<UploadedImage[]> {
  console.log(`📦 批量上传 ${images.length} 张博客图片...`)

  const results: UploadedImage[] = []

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    console.log(`\n[${i + 1}/${images.length}] 上传: ${image.filename}`)

    try {
      const result = await uploadBlogImage(image)
      results.push(result)
    } catch (error) {
      console.error(`❌ 上传失败: ${image.filename}`, error)
      throw error
    }
  }

  console.log(`\n✅ 批量上传完成! 共 ${results.length} 张图片`)
  return results
}

/**
 * 删除博客图片
 * @param imagePath Supabase Storage 路径
 */
export async function deleteBlogImage(imagePath: string): Promise<void> {
  console.log('🗑️  删除博客图片:', imagePath)

  try {
    const { error } = await supabaseAdmin.storage
      .from(BLOG_IMAGES_BUCKET)
      .remove([imagePath])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }

    console.log('✅ 图片删除成功')
  } catch (error: any) {
    console.error('❌ 图片删除失败:', error)
    throw error
  }
}

/**
 * 检查 Supabase Storage 是否配置正确
 */
export async function checkStorageHealth(): Promise<{
  healthy: boolean
  message: string
}> {
  try {
    // 尝试列出 bucket 内容（不需要实际文件）
    const { data, error } = await supabaseAdmin.storage
      .from(BLOG_IMAGES_BUCKET)
      .list('', { limit: 1 })

    if (error) {
      return {
        healthy: false,
        message: `Supabase Storage 连接失败: ${error.message}`,
      }
    }

    return {
      healthy: true,
      message: 'Supabase Storage 连接正常',
    }
  } catch (error: any) {
    return {
      healthy: false,
      message: `Supabase Storage 检查失败: ${error.message}`,
    }
  }
}

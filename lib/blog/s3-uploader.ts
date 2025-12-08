/**
 * 博客图片 S3 上传服务
 * 上传博客图片到 AWS S3/Cloudflare R2
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs/promises'
import path from 'path'

// S3 客户端配置 (使用 EC2 Instance Profile 自动获取凭证)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-1',
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'static.vidfab.ai'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface BlogImageUploadResult {
  original?: string
  thumbnail?: string
  webp?: string
}

/**
 * 上传单个图片到 S3
 * @param filePath 本地文件路径
 * @param s3Key S3 存储路径 (例如: public/blog/2025/12/image.jpg)
 * @param contentType MIME 类型
 * @returns CDN URL
 */
export async function uploadToS3(
  filePath: string,
  s3Key: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // 读取文件
    const fileBuffer = await fs.readFile(filePath)

    // 上传到 S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}/${s3Key}`

    console.log(`✅ Uploaded to S3: ${url}`)

    return { success: true, url }
  } catch (error) {
    console.error('❌ S3 upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    }
  }
}

/**
 * 上传博客图片 (原图 + 缩略图 + WebP)
 * @param originalPath 原图路径
 * @param thumbnailPath 缩略图路径
 * @param webpPath WebP 路径
 * @param slug 文章 slug (用于生成文件名)
 * @returns 所有上传后的 CDN URL
 */
export async function uploadBlogImages(
  originalPath: string,
  thumbnailPath: string,
  webpPath: string,
  slug: string
): Promise<BlogImageUploadResult> {
  try {
    // 生成 S3 路径: public/blog/[year]/[month]/[filename]
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()

    const baseKey = `public/blog/${year}/${month}/${slug}-${timestamp}`

    console.log('📤 Uploading blog images to S3...')

    // 并行上传所有图片
    const [originalResult, thumbnailResult, webpResult] = await Promise.all([
      uploadToS3(originalPath, `${baseKey}.jpg`, 'image/jpeg'),
      uploadToS3(thumbnailPath, `${baseKey}-thumb.jpg`, 'image/jpeg'),
      uploadToS3(webpPath, `${baseKey}.webp`, 'image/webp'),
    ])

    if (!originalResult.success || !thumbnailResult.success || !webpResult.success) {
      throw new Error('部分图片上传失败')
    }

    console.log('✅ All images uploaded successfully')

    return {
      original: originalResult.url,
      thumbnail: thumbnailResult.url,
      webp: webpResult.url,
    }
  } catch (error) {
    console.error('❌ Blog images upload failed:', error)
    throw error
  }
}

/**
 * 从 URL 下载文件并上传到 S3
 * @param fileUrl 源文件 URL
 * @param s3Key S3 存储路径
 * @returns CDN URL
 */
export async function downloadAndUploadToS3(
  fileUrl: string,
  s3Key: string
): Promise<UploadResult> {
  try {
    // 下载文件
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return { success: false, error: '下载文件失败' }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // 上传到 S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}/${s3Key}`
    return { success: true, url }
  } catch (error) {
    console.error('❌ 下载并上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载或上传失败',
    }
  }
}

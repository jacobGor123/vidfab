/**
 * Discover 视频/图片上传到 S3
 * 基于用户提供的 S3 上传代码示例
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

// S3 客户端配置
// 使用 EC2 Instance Profile，不需要显式配置 credentials
// AWS SDK 会自动从 EC2 实例元数据服务获取临时凭证
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-1'
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'static.vidfab.ai'
const DISCOVER_UPLOAD_PREFIXES = ['discover-new/videos/', 'discover-new/images/']

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * 从 Discover CDN/S3 URL 中解析可删除的 S3 object key。
 * 只允许删除 Discover 上传前缀下的对象，避免误删 bucket 里的其他文件。
 */
export function getDiscoverS3ObjectKey(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null

  try {
    const url = new URL(fileUrl)
    let key = ''

    if (url.hostname === BUCKET_NAME) {
      key = url.pathname.replace(/^\/+/, '')
    } else if (url.hostname === `${BUCKET_NAME}.s3.amazonaws.com` || url.hostname.startsWith(`${BUCKET_NAME}.s3.`)) {
      key = url.pathname.replace(/^\/+/, '')
    }

    if (!key || !DISCOVER_UPLOAD_PREFIXES.some(prefix => key.startsWith(prefix))) {
      return null
    }

    return decodeURIComponent(key)
  } catch {
    return null
  }
}

/**
 * 删除 Discover 上传到 S3 的视频/图片。外部 URL 会被跳过并视为成功。
 */
export async function deleteDiscoverAssetFromS3(fileUrl: string | null | undefined): Promise<UploadResult> {
  const key = getDiscoverS3ObjectKey(fileUrl)

  if (!key) {
    return { success: true }
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    }))

    return { success: true }
  } catch (error) {
    console.error('S3 素材删除失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败'
    }
  }
}

export async function deleteDiscoverAssetsFromS3(urls: Array<string | null | undefined>) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))) as string[]
  const results = await Promise.all(uniqueUrls.map(url => deleteDiscoverAssetFromS3(url)))

  return results
    .map((result, index) => result.success ? null : `${uniqueUrls[index]}: ${result.error}`)
    .filter((error): error is string => Boolean(error))
}

/**
 * 上传视频到 S3
 * @param file 视频文件 Buffer 或 Blob
 * @param contentType MIME 类型
 * @returns CDN URL
 */
export async function uploadVideoToS3(
  file: Buffer | Uint8Array,
  contentType: string = 'video/mp4'
): Promise<UploadResult> {
  try {
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    const fileName = `discover-video-${uuid}-${timestamp}.mp4`
    const key = `discover-new/videos/${fileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}/${key}`
    return { success: true, url }
  } catch (error) {
    console.error('S3 视频上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    }
  }
}

/**
 * 上传图片到 S3
 * @param file 图片文件 Buffer 或 Blob
 * @param contentType MIME 类型
 * @returns CDN URL
 */
export async function uploadImageToS3(
  file: Buffer | Uint8Array,
  contentType: string = 'image/png'
): Promise<UploadResult> {
  try {
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()

    // 根据 contentType 确定文件扩展名
    const ext = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg' // 默认

    const fileName = `discover-image-${uuid}-${timestamp}.${ext}`
    const key = `discover-new/images/${fileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}/${key}`
    return { success: true, url }
  } catch (error) {
    console.error('S3 图片上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    }
  }
}

/**
 * 从 URL 下载文件并上传到 S3
 * @param fileUrl 源文件 URL
 * @param type 文件类型 'video' | 'image'
 * @returns CDN URL
 */
export async function downloadAndUploadToS3(
  fileUrl: string,
  type: 'video' | 'image'
): Promise<UploadResult> {
  try {
    // 下载文件
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return { success: false, error: '下载文件失败' }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || ''

    // 上传到 S3
    if (type === 'video') {
      return await uploadVideoToS3(buffer, contentType || 'video/mp4')
    } else {
      return await uploadImageToS3(buffer, contentType || 'image/png')
    }
  } catch (error) {
    console.error('下载并上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载或上传失败'
    }
  }
}

/**
 * 下载文件到 Buffer
 * @param fileUrl 文件 URL
 * @returns Buffer 或 null
 */
export async function downloadToBuffer(fileUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    return null
  }
}

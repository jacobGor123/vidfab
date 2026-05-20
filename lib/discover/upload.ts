/**
 * Discover video/image storage helpers.
 *
 * Admin uploads use Supabase Storage so the app does not depend on AWS
 * instance credentials in Vercel.
 */

import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { STORAGE_CONFIG } from '@/lib/storage'

type UploadKind = 'video' | 'image'

const DISCOVER_STORAGE = {
  video: {
    bucket: STORAGE_CONFIG.buckets.videos,
    prefix: 'discover/videos',
    base: 'discover-video',
  },
  image: {
    bucket: STORAGE_CONFIG.buckets.images,
    prefix: 'discover/images',
    base: 'discover-image',
  },
} as const

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

interface UploadResult {
  success: boolean
  url?: string
  error?: string
  bucket?: string
  path?: string
  token?: string
  signedUrl?: string
}

function getExtension(contentType: string, fileName: string, kind: UploadKind) {
  const fromMime = MIME_TO_EXT[contentType.toLowerCase()]
  if (fromMime) return fromMime

  const fromName = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName

  return kind === 'video' ? 'mp4' : 'jpg'
}

function createDiscoverStoragePath(kind: UploadKind, contentType: string, fileName: string) {
  const target = DISCOVER_STORAGE[kind]
  const ext = getExtension(contentType, fileName, kind)
  return `${target.prefix}/${target.base}-${crypto.randomUUID()}-${Date.now()}.${ext}`
}

function getPublicUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function getDiscoverStorageObject(
  fileUrl: string | null | undefined
): { bucket: string; path: string } | null {
  if (!fileUrl) return null

  try {
    const url = new URL(fileUrl)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) {
      return null
    }

    const marker = '/storage/v1/object/public/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    const slashIndex = objectPath.indexOf('/')
    if (slashIndex === -1) return null

    const bucket = objectPath.slice(0, slashIndex)
    const path = objectPath.slice(slashIndex + 1)

    const validDiscoverObject =
      (bucket === DISCOVER_STORAGE.video.bucket && path.startsWith(`${DISCOVER_STORAGE.video.prefix}/`)) ||
      (bucket === DISCOVER_STORAGE.image.bucket && path.startsWith(`${DISCOVER_STORAGE.image.prefix}/`))

    if (!validDiscoverObject) {
      return null
    }

    return { bucket, path }
  } catch {
    return null
  }
}

/**
 * 删除 Discover 上传到 Supabase Storage 的视频/图片。
 * 外部 URL 和历史 S3 URL 会被跳过并视为成功。
 */
export async function deleteDiscoverAssetFromStorage(fileUrl: string | null | undefined): Promise<UploadResult> {
  const target = getDiscoverStorageObject(fileUrl)

  if (!target) {
    return { success: true }
  }

  try {
    const { error } = await supabaseAdmin.storage.from(target.bucket).remove([target.path])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Discover 素材删除失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败'
    }
  }
}

export async function deleteDiscoverAssetsFromStorage(urls: Array<string | null | undefined>) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))) as string[]
  const results = await Promise.all(uniqueUrls.map(url => deleteDiscoverAssetFromStorage(url)))

  return results
    .map((result, index) => result.success ? null : `${uniqueUrls[index]}: ${result.error}`)
    .filter((error): error is string => Boolean(error))
}

export async function createDiscoverSignedUploadUrl(
  kind: UploadKind,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  try {
    if (!contentType.startsWith(`${kind}/`)) {
      return { success: false, error: `Invalid ${kind} content type` }
    }

    const target = DISCOVER_STORAGE[kind]
    const path = createDiscoverStoragePath(kind, contentType, fileName || 'discover-upload')
    const { data, error } = await supabaseAdmin.storage
      .from(target.bucket)
      .createSignedUploadUrl(path)

    if (error || !data?.token) {
      throw error || new Error('No upload token returned')
    }

    return {
      success: true,
      bucket: target.bucket,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      url: getPublicUrl(target.bucket, path),
    }
  } catch (error) {
    console.error('Discover 上传链接创建失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建上传链接失败'
    }
  }
}

async function uploadToDiscoverStorage(
  kind: UploadKind,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  try {
    const target = DISCOVER_STORAGE[kind]
    const path = createDiscoverStoragePath(kind, contentType, 'discover-upload')

    const { data, error } = await supabaseAdmin.storage
      .from(target.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        contentType,
        upsert: false,
      })

    if (error) {
      throw error
    }

    const finalPath = data?.path || path
    return {
      success: true,
      bucket: target.bucket,
      path: finalPath,
      url: getPublicUrl(target.bucket, finalPath),
    }
  } catch (error) {
    console.error('Discover 素材上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    }
  }
}

/**
 * 上传视频到 Supabase Storage
 * @param file 视频文件 Buffer 或 Blob
 * @param contentType MIME 类型
 * @returns CDN URL
 */
export async function uploadVideoToDiscoverStorage(
  file: Buffer | Uint8Array,
  contentType: string = 'video/mp4'
): Promise<UploadResult> {
  return uploadToDiscoverStorage('video', file, contentType)
}

/**
 * 上传图片到 Supabase Storage
 * @param file 图片文件 Buffer 或 Blob
 * @param contentType MIME 类型
 * @returns CDN URL
 */
export async function uploadImageToDiscoverStorage(
  file: Buffer | Uint8Array,
  contentType: string = 'image/png'
): Promise<UploadResult> {
  return uploadToDiscoverStorage('image', file, contentType)
}

/**
 * 从 URL 下载文件并上传到 Supabase Storage
 * @param fileUrl 源文件 URL
 * @param type 文件类型 'video' | 'image'
 * @returns CDN URL
 */
export async function downloadAndUploadToDiscoverStorage(
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

    // 上传到 Supabase Storage
    if (type === 'video') {
      return await uploadVideoToDiscoverStorage(buffer, contentType || 'video/mp4')
    } else {
      return await uploadImageToDiscoverStorage(buffer, contentType || 'image/png')
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

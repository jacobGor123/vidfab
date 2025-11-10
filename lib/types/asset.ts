/**
 * Unified Asset Types
 * 统一资产类型 - 用于 MyAssets 页面同时展示图片和视频
 */

import { UserVideo } from "@/lib/supabase"

// 用户图片数据库记录类型（对应 user_images 表）
export interface UserImage {
  id: string
  user_id: string
  wavespeed_request_id: string
  prompt: string
  original_url: string
  storage_url: string
  storage_path: string | null
  model: string
  aspect_ratio: string | null
  generation_type: 'text-to-image' | 'image-to-image'
  source_images: any | null
  status: 'completed' | 'failed'
  error_message: string | null
  file_size: number | null  // 🔥 添加文件大小字段（字节）
  metadata: any | null
  created_at: string
  updated_at: string
}

// 资产类型枚举
export type AssetType = 'image' | 'video'

// 统一资产接口
export interface UnifiedAsset {
  id: string
  type: AssetType
  prompt: string
  previewUrl: string  // 预览 URL (图片用 storage_url,视频用 thumbnail_path)
  downloadUrl: string // 下载 URL (图片用 storage_url,视频用 storage_path)
  status: 'completed' | 'processing' | 'failed' | 'generating' | 'downloading'
  fileSize: number | null
  createdAt: string
  updatedAt: string
  // 原始数据
  rawData: UserVideo | UserImage
}

// 类型守卫：判断是否为视频
export function isVideoAsset(asset: UnifiedAsset): asset is UnifiedAsset & { rawData: UserVideo } {
  return asset.type === 'video'
}

// 类型守卫：判断是否为图片
export function isImageAsset(asset: UnifiedAsset): asset is UnifiedAsset & { rawData: UserImage } {
  return asset.type === 'image'
}

/**
 * 合并图片和视频为统一资产列表
 * @param videos 视频列表
 * @param images 图片列表
 * @returns 统一的资产列表,按创建时间倒序排序
 */
export function mergeAssets(videos: UserVideo[], images: UserImage[]): UnifiedAsset[] {
  const videoAssets: UnifiedAsset[] = videos.map(v => ({
    id: v.id,
    type: 'video' as AssetType,
    prompt: v.prompt,
    previewUrl: v.thumbnail_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/video-thumbnails/${v.thumbnail_path}`
      : v.storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-videos/${v.storage_path}`
      : v.original_url || '',
    downloadUrl: v.storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-videos/${v.storage_path}`
      : v.original_url || '',
    status: v.status as UnifiedAsset['status'],
    fileSize: v.file_size,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    rawData: v
  }))

  const imageAssets: UnifiedAsset[] = images.map(i => ({
    id: i.id,
    type: 'image' as AssetType,
    prompt: i.prompt,
    previewUrl: i.storage_url,
    downloadUrl: i.storage_url,
    status: i.status === 'completed' ? 'completed' : 'failed',
    fileSize: i.file_size,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    rawData: i
  }))

  // 合并并按创建时间倒序排序
  return [...videoAssets, ...imageAssets].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

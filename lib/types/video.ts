/**
 * Video Generation Types
 * 视频生成相关的类型定义
 */

// 基础视频生成参数
export interface BaseVideoGenerationRequest {
  prompt: string
  model: string
  duration: number  // 5 or 10 (seconds)
  resolution: string  // "480p", "720p", "1080p"
  aspectRatio: string  // "16:9", "9:16", "1:1"
  seed?: number
  cameraFixed?: boolean
  watermark?: boolean  // 是否添加水印（默认 false）
}

// 扩展支持image参数的视频生成请求
export interface VideoGenerationRequest extends BaseVideoGenerationRequest {
  image?: string  // Base64编码的图片或图片URL，用于image-to-video
  imageStrength?: number  // 图片影响强度 0.1-1.0，默认0.8
  generateAudio?: boolean  // 是否生成音频（仅 veo3 模型支持）
  size?: string  // 合并尺寸参数，如 "1280*720"（Sora 2 使用）
}

// 生成类型枚举
export type VideoGenerationType = "text-to-video" | "image-to-video" | "video-effects"

// Duration mapping from UI strings to API numbers
export const DURATION_MAP: Record<string, number> = {
  "3s": 3,
  "4s": 4,
  "5s": 5,
  "6s": 6,
  "7s": 7,
  "8s": 8,
  "9s": 9,
  "10s": 10,
  "11s": 11,
  "12s": 12,
  "13s": 13,
  "14s": 14,
  "15s": 15,
} as const

// 辅助函数：判断生成类型
export function getGenerationType(request: VideoGenerationRequest): VideoGenerationType {
  // 🔥 首先检查是否是视频特效
  if (request.effectId || request.generationType === 'video-effects') {
    return "video-effects"
  }

  // 然后检查是否是图片转视频
  return request.image ? "image-to-video" : "text-to-video"
}

export interface VideoGenerationResponse {
  data: {
    id: string  // request ID for polling
  }
}

export interface VideoStatusResponse {
  data: {
    id: string
    status: "queued" | "processing" | "completed" | "failed"
    outputs?: string[]  // video URLs when completed
    error?: string
    progress?: number
    created_at?: string
    updated_at?: string
    lastFrameUrl?: string  // 视频结束帧 URL，用于连续镜头过渡
  }
}

export interface VideoJob {
  id: string  // local ID
  requestId: string  // Wavespeed request ID
  prompt: string
  settings: VideoGenerationSettings
  status: "pending" | "generating" | "processing" | "completed" | "failed" | "storing"
  progress?: number
  resultUrl?: string
  videoId?: string  // Database video ID for storing jobs
  error?: string
  createdAt: string
  updatedAt: string
  userId: string
  userEmail?: string  // 用户邮箱，用于内部调用
  generationType?: VideoGenerationType  // 生成类型标识
  sourceImage?: string  // 源图片（image-to-video使用）
  // Video-effects 特有字段
  effectId?: string    // 特效ID
  effectName?: string  // 特效名称
  // 🔥 积分管理字段
  reservationId?: string  // 积分预扣ID，用于确认消费
}

export interface VideoGenerationSettings {
  model: string
  duration: string
  resolution: string
  aspectRatio: string
  style?: string
  seed?: number
  // Image-to-video 特有设置
  imageStrength?: number  // 图片影响强度
  generationType?: VideoGenerationType  // 生成类型
  // Video-effects 特有设置
  effectId?: string    // 特效ID
  effectName?: string  // 特效名称
}

export interface VideoResult {
  id: string
  videoUrl: string
  thumbnailUrl?: string
  prompt: string
  settings: VideoGenerationSettings
  createdAt: string
  userId: string
  isStored?: boolean // 🔥 新增：标记是否已存储到数据库
}

// Model mapping from UI to API
export const MODEL_API_MAP: Record<string, string> = {
  // Text-to-Video models
  "vidfab-q1-480p": "seedance-v1-pro-t2v-480p",
  "vidfab-q1-720p": "seedance-v1-pro-t2v-720p",
  "vidfab-q1-1080p": "seedance-v1-pro-t2v-1080p",
  // Image-to-Video models
  "vidfab-q1-i2v-480p": "seedance-v1-pro-i2v-480p",
  "vidfab-q1-i2v-720p": "seedance-v1-pro-i2v-720p",
  "vidfab-q1-i2v-1080p": "seedance-v1-pro-i2v-1080p",
  // Vidfab Pro (veo3) models - Text-to-Video
  "vidfab-pro-720p": "veo3-fast-t2v",
  "vidfab-pro-1080p": "veo3-fast-t2v",
  // Vidfab Pro (veo3) models - Image-to-Video
  "vidfab-pro-i2v-720p": "veo3-fast-i2v",
  "vidfab-pro-i2v-1080p": "veo3-fast-i2v",
  // Sora 2 models
  "sora-2-t2v": "sora-2-t2v",
  "sora-2-i2v": "sora-2-i2v",
  // Kling 3.0 models
  "kling-3-t2v": "kwaivgi/kling-v3.0-std/text-to-video",
  // Video Effects models - 独立端点，不需要映射
  "video-effects": "video-effects-api"
}


// Generate model key from settings
export function getModelKey(model: string, resolution: string, generationType?: VideoGenerationType): string {
  // 🔥 视频特效使用固定的键，不依赖模型或分辨率
  if (generationType === "video-effects") {
    return "video-effects"
  }

  // Sora 2 不依赖 resolution，直接返回固定 key
  if (model === "sora-2") {
    return generationType === "image-to-video" ? "sora-2-i2v" : "sora-2-t2v"
  }

  // Kling 3.0 不依赖 resolution
  if (model === "kling-3") {
    return "kling-3-t2v"
  }

  const modelMap: Record<string, string> = {
    "vidfab-q1": "vidfab-q1",
    "vidfab-pro": "vidfab-pro"
  }

  const mappedModel = modelMap[model] || model

  // 为image-to-video添加i2v后缀
  if (generationType === "image-to-video") {
    return `${mappedModel}-i2v-${resolution.toLowerCase()}`
  }

  return `${mappedModel}-${resolution.toLowerCase()}`
}

// 图片验证辅助函数
export function validateImageData(image: string): boolean {
  // 更安全的检查：确保image是字符串且不为空
  if (!image || typeof image !== 'string' || image.trim() === '') {
    console.log('🔍 validateImageData failed - invalid image:', typeof image, image?.length)
    return false
  }

  // 检查是否是base64编码
  if (image.startsWith('data:image/')) {
    const base64Data = image.split(',')[1]
    if (!base64Data) return false

    try {
      // 验证base64格式
      atob(base64Data)
      return true
    } catch {
      return false
    }
  }

  // 检查是否是有效URL
  try {
    new URL(image)
    return true
  } catch {
    return false
  }
}

// 获取图片大小（支持base64和HTTP URL）
export function getImageSize(image: string): number {
  if (!image || typeof image !== 'string' || image.trim() === '') {
    console.log('🔍 getImageSize failed - invalid image:', typeof image, image?.length)
    return 0
  }

  // 如果是base64格式，计算解码后的大小
  if (image.startsWith('data:image/')) {
    const base64Data = image.split(',')[1]
    if (!base64Data) return 0

    // base64编码后的大小约为原文件的4/3
    return Math.round((base64Data.length * 3) / 4)
  }

  // 如果是HTTP URL格式，我们无法直接获取文件大小
  // 对于URL格式，返回一个安全的默认值（假设在10MB限制内）
  // 实际的大小检查应该在上传时进行
  try {
    new URL(image)
    // 返回0表示无法确定大小，但这种情况下不应该阻止请求
    // 因为图片已经通过前端验证和Supabase上传验证
    return 0
  } catch {
    return 0
  }
}

// 图片格式验证（支持base64和HTTP URL两种格式）
export function validateImageFormat(image: string): boolean {
  if (!image || typeof image !== 'string' || image.trim() === '') {
    console.log('🔍 validateImageFormat failed - invalid image:', typeof image, image?.length)
    return false
  }

  // 检查是否是base64格式
  if (image.startsWith('data:image/')) {
    const mimeType = image.split(';')[0].split(':')[1]
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return supportedFormats.includes(mimeType)
  }

  // 检查是否是HTTP URL格式（Supabase等存储服务）
  try {
    const url = new URL(image)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    // 从URL路径提取文件扩展名
    const pathname = url.pathname.toLowerCase()
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

    return supportedExtensions.some(ext => pathname.endsWith(ext))
  } catch {
    // 如果URL无效，返回false
    return false
  }
}
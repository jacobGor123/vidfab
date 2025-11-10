/**
 * Image Generation Types
 * 图片生成相关的类型定义
 */

// 图片生成类型枚举
export type ImageGenerationType = "text-to-image" | "image-to-image"

// 基础图片生成参数
export interface BaseImageGenerationRequest {
  prompt: string
  model: string  // "seedream-v4" | "nano-banana"
  aspectRatio: string  // "1:1", "16:9", "9:16", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "21:9"
}

// 扩展支持 images 参数的图片生成请求
export interface ImageGenerationRequest extends BaseImageGenerationRequest {
  images?: string[]  // 图片 URL 数组，用于 image-to-image（最多3张）
  generationType?: ImageGenerationType
}

// 图片生成响应
export interface ImageGenerationResponse {
  data: {
    id: string  // request ID for polling
    model: string
  }
}

// 图片生成状态响应
export interface ImageStatusResponse {
  data: {
    id: string
    status: "created" | "processing" | "completed" | "failed"
    outputs?: string[]  // 图片 URLs when completed（只返回1张）
    error?: string
    progress?: number
    created_at?: string
    updated_at?: string
  }
}

// 图片生成任务
export interface ImageJob {
  id: string  // local ID
  requestId: string  // Wavespeed request ID
  prompt: string
  settings: ImageGenerationSettings
  status: "pending" | "processing" | "completed" | "failed" | "storing"
  progress?: number
  resultUrl?: string  // 生成的图片 URL
  imageId?: string  // Database image ID
  error?: string
  createdAt: string
  updatedAt: string
  userId: string
  userEmail?: string
  generationType: ImageGenerationType
  sourceImages?: string[]  // 源图片（image-to-image 使用）
}

// 图片生成设置
export interface ImageGenerationSettings {
  model: string
  aspectRatio: string
  generationType: ImageGenerationType
}

// 图片结果
export interface ImageResult {
  id: string
  imageUrl: string
  prompt: string
  settings: ImageGenerationSettings
  createdAt: string
  userId: string
  isStored?: boolean  // 标记是否已存储到数据库
}

// Aspect Ratio 到 Size 的映射（用于 Seedream V4）
export const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
  "1:1": "1024*1024",
  "16:9": "1536*864",
  "9:16": "864*1536",
  "3:2": "1254*836",
  "2:3": "836*1254",
  "3:4": "1024*1365",
  "4:3": "1365*1024",
  "4:5": "1024*1280",
  "5:4": "1280*1024",
  "21:9": "1792*768"
} as const

// 支持的 Aspect Ratios
export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "21:9"] as const

// Model 映射配置
export const IMAGE_MODEL_CONFIG = {
  "seedream-v4": {
    name: "Bytedance Seedream V4",
    icon: "/logo/seedream.webp",
    textToImageEndpoint: "/bytedance/seedream-v4",
    imageToImageEndpoint: "/bytedance/seedream-v4/edit",
    useSizeParam: true  // 使用 size 参数而不是 aspect_ratio
  },
  "nano-banana": {
    name: "Google Nano Banana",
    icon: "/logo/google-nano-ba.png",
    textToImageEndpoint: "/google/nano-banana/text-to-image",
    imageToImageEndpoint: "/google/nano-banana/edit",
    useSizeParam: false  // 使用 aspect_ratio 参数
  }
} as const

// 辅助函数：判断生成类型
export function getImageGenerationType(request: ImageGenerationRequest): ImageGenerationType {
  return request.images && request.images.length > 0 ? "image-to-image" : "text-to-image"
}

// 辅助函数：获取 API 端点
export function getImageAPIEndpoint(model: string, generationType: ImageGenerationType): string {
  const config = IMAGE_MODEL_CONFIG[model as keyof typeof IMAGE_MODEL_CONFIG]
  if (!config) {
    throw new Error(`Unsupported model: ${model}`)
  }

  return generationType === "text-to-image"
    ? config.textToImageEndpoint
    : config.imageToImageEndpoint
}

// 辅助函数：构建 API 请求体
export function buildImageAPIRequest(request: ImageGenerationRequest): any {
  const config = IMAGE_MODEL_CONFIG[request.model as keyof typeof IMAGE_MODEL_CONFIG]
  if (!config) {
    throw new Error(`Unsupported model: ${request.model}`)
  }

  const generationType = getImageGenerationType(request)
  const apiRequest: any = {
    prompt: request.prompt,
    enable_sync_mode: false,
    enable_base64_output: false
  }

  // 如果是 image-to-image，添加 images 参数
  if (generationType === "image-to-image" && request.images) {
    apiRequest.images = request.images
  }

  // 根据模型添加尺寸/比例参数
  if (generationType === "text-to-image") {
    if (config.useSizeParam) {
      // Seedream V4 使用 size 参数
      apiRequest.size = ASPECT_RATIO_TO_SIZE[request.aspectRatio] || "1024*1024"
    } else {
      // Nano Banana 使用 aspect_ratio 参数
      apiRequest.aspect_ratio = request.aspectRatio
    }
  }

  return apiRequest
}

// 图片验证辅助函数
export function validateImageURL(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false
  }

  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 图片格式验证
export function validateImageFormat(url: string): boolean {
  if (!validateImageURL(url)) {
    return false
  }

  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    return supportedExtensions.some(ext => pathname.endsWith(ext))
  } catch {
    return false
  }
}

// 验证图片生成请求
export function validateImageRequest(request: ImageGenerationRequest): string[] {
  const errors: string[] = []
  const generationType = getImageGenerationType(request)

  // 通用验证
  if (!request.prompt?.trim()) {
    errors.push("Prompt is required")
  }

  if (request.prompt && request.prompt.length > 1000) {
    errors.push("Prompt must be 1000 characters or less")
  }

  if (!request.model) {
    errors.push("Model is required")
  }

  if (!IMAGE_MODEL_CONFIG[request.model as keyof typeof IMAGE_MODEL_CONFIG]) {
    errors.push(`Unsupported model: ${request.model}`)
  }

  // Text-to-image 特有验证
  if (generationType === "text-to-image") {
    if (!ASPECT_RATIOS.includes(request.aspectRatio as any)) {
      errors.push("Invalid aspect ratio")
    }
  }

  // Image-to-image 特有验证
  if (generationType === "image-to-image") {
    if (!request.images || request.images.length === 0) {
      errors.push("At least one image is required for image-to-image generation")
    }

    if (request.images && request.images.length > 3) {
      errors.push("Maximum 3 images allowed for image-to-image generation")
    }

    // 验证每个图片 URL
    if (request.images) {
      request.images.forEach((imageUrl, index) => {
        if (!validateImageURL(imageUrl)) {
          errors.push(`Invalid image URL at position ${index + 1}`)
        }
      })
    }
  }

  return errors
}

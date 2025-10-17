/**
 * Wavespeed API Service
 * 封装Wavespeed API调用逻辑，包括错误处理和重试机制
 */

import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoStatusResponse,
  MODEL_API_MAP,
  DURATION_MAP,
  getModelKey,
  getGenerationType,
  validateImageData,
  getImageSize,
  validateImageFormat
} from "@/lib/types/video"

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3"
const WAVESPEED_API_KEY = "a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929"

// Rate limiting and retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 10000 // 10 seconds

// Error types
export class WavespeedAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = "WavespeedAPIError"
  }
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on certain error types
      if (error instanceof WavespeedAPIError && error.status && error.status < 500) {
        throw error
      }

      if (attempt === maxRetries - 1) {
        break
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000,
        MAX_RETRY_DELAY
      )

      console.warn(`API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Make authenticated API request
async function makeAPIRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${WAVESPEED_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorData: any = null
    let rawErrorText = ""

    try {
      const responseText = await response.text()
      rawErrorText = responseText

      try {
        errorData = JSON.parse(responseText)
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Failed to parse as JSON, use raw text
        errorMessage = responseText || errorMessage
      }
    } catch {
      // Failed to read response
    }

    // Enhanced error logging for debugging
    console.error('🔥 API Request Failed:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      errorData,
      rawErrorText,
      requestMethod: 'POST'
    })

    throw new WavespeedAPIError(
      errorMessage,
      response.status,
      errorData?.code
    )
  }

  return response
}

/**
 * Submit a video generation request (unified interface)
 * 提交视频生成请求（统一接口，自动处理text-to-video和image-to-video）
 */
export async function submitVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  return submitGeneralVideoGeneration(request)
}

/**
 * Submit an image-to-video generation request
 * 提交图片转视频请求
 */
export async function submitImageToVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const generationType = getGenerationType(request)
  if (generationType !== "image-to-video") {
    throw new WavespeedAPIError("Use submitVideoGeneration for text-to-video requests")
  }

  return submitGeneralVideoGeneration(request)
}

/**
 * Submit a video effects generation request
 * 提交视频特效请求
 */
export async function submitVideoEffectsGeneration(
  request: { image: string; effectId: string; effectName?: string }
): Promise<VideoGenerationResponse> {
  // 🔥 将视频特效请求转换为通用请求格式
  const videoRequest: VideoGenerationRequest = {
    prompt: `${request.effectName || request.effectId} Effect`, // 使用特效名称作为提示
    image: request.image,
    effectId: request.effectId,
    effectName: request.effectName,
    generationType: 'video-effects',
    model: 'video-effects', // 固定模型
    resolution: '720p', // 视频特效的默认分辨率
    duration: '5s' // 视频特效固定5秒（API最低要求）
  }

  return submitGeneralVideoGeneration(videoRequest)
}

/**
 * Submit a video generation request (general implementation)
 * 提交视频生成请求（通用实现，支持text-to-video和image-to-video）
 */
async function submitGeneralVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  // 检测生成类型
  const generationType = getGenerationType(request)

  // Map UI settings to API format
  const modelKey = getModelKey(request.model, request.resolution, generationType)
  const apiModel = MODEL_API_MAP[modelKey]

  if (!apiModel) {
    throw new WavespeedAPIError(`Unsupported model configuration: ${modelKey}`)
  }

  // 检查是否是 veo3 模型
  const isVeo3Model = apiModel.includes('veo3')

  let apiRequest: any
  let endpoint: string

  if (generationType === "video-effects") {
    // 🔥 视频特效暂时使用图片转视频的端点，加上特效参数
    apiRequest = {
      prompt: request.prompt || `Apply ${request.effectName || request.effectId} effect to the image`,
      image: request.image,
      duration: 5,  // 视频特效固定5秒（API最低要求）
      camera_fixed: true,  // 特效通常需要固定镜头
      seed: -1,
      // 特效相关的额外参数（将来可能会用到）
      effect_id: request.effectId,
      effect_name: request.effectName
    }

    // 🔥 暂时使用 bytedance i2v 端点，将来需要替换为真实的视频特效端点
    endpoint = "/bytedance/seedance-v1-pro-i2v-720p"

  } else if (isVeo3Model) {
    // veo3 API 参数格式
    apiRequest = {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      duration: DURATION_MAP[`${request.duration}s`] || request.duration,
      resolution: request.resolution,
      generate_audio: true 
    }

    // 为 image-to-video 添加 image 参数
    if (generationType === "image-to-video" && request.image) {
      apiRequest.image = request.image
      endpoint = "/google/veo3-fast/image-to-video"
    } else {
      endpoint = "/google/veo3-fast"
    }

  } else {
    // 原有 bytedance API 参数格式
    apiRequest = {
      prompt: request.prompt,
      duration: DURATION_MAP[`${request.duration}s`] || request.duration,
      camera_fixed: request.cameraFixed ?? false,
      seed: request.seed ?? -1,
    }

    // 对于text-to-video添加aspect_ratio
    if (generationType === "text-to-video") {
      apiRequest.aspect_ratio = request.aspectRatio
    }

    // 对于image-to-video添加image参数
    if (generationType === "image-to-video" && request.image) {
      apiRequest.image = request.image
    }

    endpoint = `/bytedance/${apiModel}`
  }

  console.log(`🚀 Submitting ${generationType} request to ${isVeo3Model ? 'veo3' : 'bytedance'} (${apiModel}):`, {
    endpoint,
    ...apiRequest,
    image: apiRequest.image ? `[IMAGE_URL: ${apiRequest.image.substring(0, 50)}...]` : undefined  // 显示图片URL的前50个字符
  })

  return retryWithBackoff(async () => {
    const response = await makeAPIRequest(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(apiRequest),
      }
    )

    const result = await response.json() as VideoGenerationResponse
    console.log(`✅ ${generationType} generation submitted successfully. Request ID: ${result.data.id}`)

    return result
  })
}

/**
 * Check video generation status
 * 检查视频生成状态
 */
export async function checkVideoStatus(
  requestId: string
): Promise<VideoStatusResponse> {
  return retryWithBackoff(async () => {
    const response = await makeAPIRequest(`/predictions/${requestId}/result`)
    const result = await response.json() as VideoStatusResponse

    console.log(`📊 Status check for ${requestId}:`, {
      status: result.data.status,
      progress: result.data.progress,
      hasOutputs: !!result.data.outputs?.length
    })

    return result
  }, 2) // Fewer retries for status checks
}

/**
 * Validate video generation request
 * 验证视频生成请求参数（支持text-to-video和image-to-video）
 */
export function validateVideoRequest(request: VideoGenerationRequest): string[] {
  const errors: string[] = []
  const generationType = getGenerationType(request)

  // 通用验证
  if (!request.prompt?.trim()) {
    errors.push("Prompt is required")
  }

  if (request.prompt && request.prompt.length > 500) {
    errors.push("Prompt must be 500 characters or less")
  }

  if (!request.model) {
    errors.push("Model is required")
  }

  if (!["480p", "720p", "1080p"].includes(request.resolution)) {
    errors.push("Invalid resolution")
  }

  if (![5, 8, 10].includes(request.duration)) {
    errors.push("Invalid duration")
  }

  // Vidfab Pro 特殊验证
  if (request.model === "vidfab-pro") {
    if (request.duration !== 8) {
      errors.push("Vidfab Pro only supports 8 seconds duration")
    }
    if (!["720p", "1080p"].includes(request.resolution)) {
      errors.push("Vidfab Pro only supports 720p and 1080p resolution")
    }

    // 根据生成类型验证宽高比
    if (generationType === "text-to-video") {
      if (!["16:9", "9:16"].includes(request.aspectRatio)) {
        errors.push("Text-to-Video Vidfab Pro supports 16:9 and 9:16 aspect ratios")
      }
    } else if (generationType === "image-to-video") {
      if (request.aspectRatio !== "16:9") {
        errors.push("Image-to-Video Vidfab Pro only supports 16:9 aspect ratio")
      }
    }
  }

  // Text-to-video特有验证
  if (generationType === "text-to-video") {
    if (!["16:9", "9:16", "1:1"].includes(request.aspectRatio)) {
      errors.push("Invalid aspect ratio")
    }
  }

  // Image-to-video特有验证
  if (generationType === "image-to-video") {
    if (!request.image) {
      errors.push("Image is required for image-to-video generation")
    } else {
      // 验证图片数据
      if (!validateImageData(request.image)) {
        errors.push("Invalid image data format")
      }

      // 验证图片格式
      if (!validateImageFormat(request.image)) {
        errors.push("Unsupported image format. Please use JPEG, PNG, or WebP")
      }

      // 验证图片大小（10MB限制）
      const imageSize = getImageSize(request.image)
      if (imageSize > 10 * 1024 * 1024) {
        errors.push("Image size must be less than 10MB")
      }

      // 验证图片强度参数
      if (request.imageStrength !== undefined) {
        if (request.imageStrength < 0.1 || request.imageStrength > 1.0) {
          errors.push("Image strength must be between 0.1 and 1.0")
        }
      }
    }
  }

  // 验证模型配置
  const modelKey = getModelKey(request.model, request.resolution, generationType)
  if (!MODEL_API_MAP[modelKey]) {
    errors.push(`Unsupported model configuration: ${modelKey}`)
  }

  return errors
}

/**
 * Get estimated generation time
 * 获取预估生成时间
 */
export function getEstimatedGenerationTime(
  resolution: string,
  duration: number
): number {
  // Base time in seconds
  const baseTime = 60 // 1 minute base

  // Resolution multiplier
  const resolutionMultiplier = {
    "480p": 1,
    "720p": 1.5,
    "1080p": 2.5
  }[resolution] || 1

  // Duration multiplier
  const durationMultiplier = duration / 5 // 5s baseline

  return Math.round(baseTime * resolutionMultiplier * durationMultiplier)
}
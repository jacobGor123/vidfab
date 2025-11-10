/**
 * Wavespeed Image API Service
 * 封装 Wavespeed 图片生成 API 调用逻辑
 */

import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageStatusResponse,
  getImageGenerationType,
  getImageAPIEndpoint,
  buildImageAPIRequest,
  validateImageRequest
} from "@/lib/types/image"

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3"
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || ""

if (!WAVESPEED_API_KEY) {
  console.error("⚠️ WAVESPEED_API_KEY is not configured in environment variables")
}

// Rate limiting and retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 10000

// Error types
export class WavespeedImageAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = "WavespeedImageAPIError"
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

      if (error instanceof WavespeedImageAPIError && error.status && error.status < 500) {
        throw error
      }

      if (attempt === maxRetries - 1) {
        break
      }

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

    try {
      const responseText = await response.text()
      try {
        errorData = JSON.parse(responseText)
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        errorMessage = responseText || errorMessage
      }
    } catch {
      // Failed to read response
    }

    console.error('🔥 Image API Request Failed:', {
      status: response.status,
      url: response.url,
      errorData
    })

    throw new WavespeedImageAPIError(
      errorMessage,
      response.status,
      errorData?.code
    )
  }

  return response
}

/**
 * Submit an image generation request (text-to-image or image-to-image)
 */
export async function submitImageGeneration(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  // 验证请求参数
  const validationErrors = validateImageRequest(request)
  if (validationErrors.length > 0) {
    throw new WavespeedImageAPIError(
      `Validation failed: ${validationErrors.join(", ")}`,
      400,
      "VALIDATION_ERROR"
    )
  }

  const generationType = getImageGenerationType(request)
  const endpoint = getImageAPIEndpoint(request.model, generationType)
  const apiRequest = buildImageAPIRequest(request)

  console.log(`🚀 Submitting ${generationType} request to ${request.model}:`, {
    endpoint,
    prompt: apiRequest.prompt,
    aspectRatio: request.aspectRatio,
    imageCount: request.images?.length || 0
  })

  return retryWithBackoff(async () => {
    const response = await makeAPIRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(apiRequest),
    })

    const result = await response.json() as ImageGenerationResponse
    console.log(`✅ ${generationType} generation submitted. Request ID: ${result.data.id}`)

    return result
  })
}

/**
 * Check image generation status
 */
export async function checkImageStatus(
  requestId: string
): Promise<ImageStatusResponse> {
  return retryWithBackoff(async () => {
    const response = await makeAPIRequest(`/predictions/${requestId}/result`)
    const result = await response.json() as ImageStatusResponse

    console.log(`📊 Status check for ${requestId}:`, {
      status: result.data.status,
      hasOutputs: !!result.data.outputs?.length
    })

    return result
  }, 2) // Fewer retries for status checks
}

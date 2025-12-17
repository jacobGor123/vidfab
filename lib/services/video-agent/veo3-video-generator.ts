/**
 * Veo 3.1 视频生成服务（基于 Wavespeed API）
 * 使用 Google Veo 3.1 Fast Image-to-Video 模型生成带旁白的视频
 *
 * 技术要点:
 * - API: Wavespeed veo3.1-fast image-to-video
 * - Duration: 仅支持 4/6/8 秒，需要智能映射
 * - 支持首尾帧过渡（连续镜头更流畅）
 */

const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3'
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || ''

if (!WAVESPEED_API_KEY) {
  console.error('⚠️ WAVESPEED_API_KEY is not configured')
}

/**
 * Veo 3.1 仅支持 4/6/8 秒时长
 * Video Agent shot duration → veo3.1 duration 映射
 */
const VEO3_DURATION_MAP: Record<number, number> = {
  3: 4,   // 3秒 → 4秒
  4: 4,   // 4秒 → 4秒
  5: 6,   // 5秒 → 6秒（最常见）
  6: 6,   // 6秒 → 6秒
  7: 6,   // 7秒 → 6秒
  8: 8,   // 8秒 → 8秒
  9: 8,   // 9秒 → 8秒
  10: 8   // 10秒 → 8秒
}

/**
 * Veo3 视频生成请求参数
 */
export interface Veo3VideoRequest {
  prompt: string              // 视频生成提示词
  image: string               // 分镜图 URL（必需）
  aspectRatio: '16:9' | '9:16'  // 宽高比
  duration: number            // 原始时长（秒）
  lastImage?: string          // 可选：结束帧图片，用于连续镜头过渡
  negativePrompt?: string     // 可选：负向提示词
}

/**
 * Veo3 视频生成响应
 */
export interface Veo3VideoResponse {
  requestId: string  // Wavespeed prediction ID
}

/**
 * Veo3 视频状态响应
 */
export interface Veo3VideoStatusResponse {
  status: 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  error: string | null
}

/**
 * 映射 Video Agent duration 到 veo3.1 支持的时长
 */
function mapDurationToVeo3(duration: number): number {
  const mapped = VEO3_DURATION_MAP[duration]
  if (!mapped) {
    console.warn(`[Veo3] Unsupported duration ${duration}s, defaulting to 6s`)
    return 6
  }
  return mapped
}

/**
 * 生成 veo 3.1 视频
 * 使用 Wavespeed API 的 veo3.1-fast image-to-video 端点
 */
export async function generateVeo3Video(
  request: Veo3VideoRequest
): Promise<Veo3VideoResponse> {
  console.log('[Veo3] Starting video generation:', {
    aspectRatio: request.aspectRatio,
    originalDuration: request.duration,
    hasLastImage: !!request.lastImage
  })

  // 1. 映射 duration 到 veo3.1 支持的值
  const veo3Duration = mapDurationToVeo3(request.duration)
  console.log(`[Veo3] Duration mapped: ${request.duration}s → ${veo3Duration}s`)

  // 2. 构建请求体（参考 wavespeed veo3.1-fast API）
  const apiRequest: any = {
    prompt: request.prompt,
    image: request.image,  // 必需：分镜图
    aspect_ratio: request.aspectRatio,
    duration: veo3Duration,  // 4/6/8
    resolution: '720p',  // 默认 720p
    generate_audio: false,  // 不生成音频（使用 Doubao TTS）
    safety_tolerance: 6  // 🔥 安全容忍度（1-6，6为最宽松）降低误拦截率
  }

  // 4. 可选参数
  if (request.lastImage) {
    apiRequest.last_image = request.lastImage  // 结束帧，用于连续镜头
  }

  if (request.negativePrompt) {
    apiRequest.negative_prompt = request.negativePrompt
  }

  console.log('[Veo3] API request:', {
    endpoint: '/google/veo3.1-fast/image-to-video',
    duration: apiRequest.duration,
    hasLastImage: !!apiRequest.last_image
  })

  try {
    // 5. 调用 Wavespeed API
    const response = await fetch(
      `${WAVESPEED_BASE_URL}/google/veo3.1-fast/image-to-video`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`
        },
        body: JSON.stringify(apiRequest)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Veo3] API error:', {
        status: response.status,
        error: errorText
      })
      throw new Error(`Veo3 API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    // 打印完整响应以便调试
    console.log('[Veo3] Full API response:', JSON.stringify(result, null, 2))

    // 根据文档，Wavespeed 响应格式应该是：{ data: { id, ... } }
    const predictionId = result.data?.id || result.id || result.prediction_id || result.requestId

    if (!predictionId) {
      console.error('[Veo3] Invalid API response structure:', result)
      throw new Error(`Invalid Veo3 API response: missing prediction ID. Response keys: ${Object.keys(result).join(', ')}`)
    }

    console.log('[Veo3] Task created:', predictionId)

    return {
      requestId: predictionId
    }
  } catch (error: any) {
    console.error('[Veo3] Video generation failed:', error)
    throw error
  }
}

/**
 * 查询 veo 3.1 视频生成状态
 * 复用 Wavespeed 状态查询机制
 */
export async function getVeo3VideoStatus(
  requestId: string
): Promise<Veo3VideoStatusResponse> {
  console.log('[Veo3] Checking video status for request:', requestId)

  try {
    const response = await fetch(
      `${WAVESPEED_BASE_URL}/predictions/${requestId}/result`,
      {
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Veo3] Status check failed:', {
        requestId,
        status: response.status,
        error: errorText
      })
      throw new Error(`Failed to get task status: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    // 打印完整响应以便调试
    console.log('[Veo3] Full status response:', JSON.stringify(result, null, 2))

    // Wavespeed 状态格式：
    // { data: { status: 'queued'|'processing'|'completed'|'failed', outputs: [...] } }

    console.log('[Veo3] Status details:', {
      requestId,
      status: result.data?.status,
      hasOutputs: !!(result.data?.outputs && result.data.outputs.length > 0),
      outputsCount: result.data?.outputs?.length || 0,
      error: result.data?.error
    })

    if (result.data.status === 'completed' && result.data.outputs?.length > 0) {
      console.log('[Veo3] Video completed:', {
        requestId,
        videoUrl: result.data.outputs[0]
      })
      return {
        status: 'completed' as const,
        videoUrl: result.data.outputs[0],
        error: null
      }
    } else if (result.data.status === 'failed') {
      console.error('[Veo3] Video generation failed:', {
        requestId,
        error: result.data.error
      })
      return {
        status: 'failed' as const,
        videoUrl: null,
        error: result.data.error || 'Generation failed'
      }
    } else {
      console.log('[Veo3] Video still processing:', {
        requestId,
        status: result.data.status
      })
      return {
        status: 'processing' as const,
        videoUrl: null,
        error: null
      }
    }
  } catch (error: any) {
    console.error('[Veo3] Status check failed:', error)
    throw error
  }
}

/**
 * 获取视频生成的参考图
 * 分镜图作为开始帧，下一个分镜图作为结束帧（实现连续过渡）
 */
export function getVideoGenerationImages(
  shot: { imageUrl?: string },
  nextShot?: { imageUrl?: string }
): { image: string; lastImage?: string } | null {
  if (!shot.imageUrl) {
    return null
  }

  const result: { image: string; lastImage?: string } = {
    image: shot.imageUrl  // 当前分镜图作为开始帧
  }

  // 如果有下一个分镜，使用其图片作为结束帧（实现连续过渡）
  if (nextShot && nextShot.imageUrl) {
    result.lastImage = nextShot.imageUrl
  }

  return result
}

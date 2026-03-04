import { VideoGenerationRequest, VideoStatusResponse } from '@/lib/types/video'
import { BytePlusContent, BytePlusVideoRequest, BytePlusVideoResponse, BytePlusVideoTaskStatus } from './types'

const DEFAULT_VIDEO_MODEL = 'seedance-1-5-pro-251215'

// Seedance 1.5 Pro 支持 4-12 秒任意整数
const MIN_DURATION = 4
const MAX_DURATION = 12

function clampDuration(duration: number | undefined): number | undefined {
  if (duration === undefined) return undefined
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(duration)))
}

/**
 * 将内部请求转换为 BytePlus 请求
 * Seedance 1.5 Pro: 使用 body-level 参数（严格校验），generate_audio 默认 true 需显式关闭
 */
export function convertToBytePlusRequest(
  request: VideoGenerationRequest,
  options?: { callbackUrl?: string; returnLastFrame?: boolean; generateAudio?: boolean }
): BytePlusVideoRequest {
  const content: BytePlusContent[] = []

  // 纯文本 prompt，不附加 --command 参数
  content.push({
    type: 'text',
    text: request.prompt,
  })

  if (request.image) {
    content.push({
      type: 'image_url',
      image_url: {
        url: request.image,
        role: 'first_frame',
      },
    })
  }

  const byteplusRequest: BytePlusVideoRequest = {
    model: DEFAULT_VIDEO_MODEL,
    content,
    callback_url: options?.callbackUrl,
    return_last_frame: options?.returnLastFrame ?? false,
    // 视频规格参数（body-level，严格校验）
    resolution: request.resolution,
    ratio: request.aspectRatio,
    duration: clampDuration(request.duration),
    watermark: request.watermark ?? false,
    generate_audio: options?.generateAudio ?? false,
  }

  // 仅在有效时传递 seed（-1 表示随机，不传）
  if (request.seed !== undefined && request.seed !== -1) {
    byteplusRequest.seed = request.seed
  }

  // 仅在明确指定时传递 camera_fixed
  if (request.cameraFixed !== undefined) {
    byteplusRequest.camera_fixed = request.cameraFixed
  }

  return byteplusRequest
}

/**
 * 状态映射到现有状态
 */
export function mapBytePlusStatus(status: BytePlusVideoTaskStatus): VideoStatusResponse['data']['status'] {
  const statusMap: Record<BytePlusVideoTaskStatus, VideoStatusResponse['data']['status']> = {
    queued: 'queued',
    running: 'processing',
    succeeded: 'completed',
    failed: 'failed',
    cancelled: 'failed',
  }
  return statusMap[status] || 'queued'
}

export function mapBytePlusResponseToStatus(response: BytePlusVideoResponse): VideoStatusResponse {
  // Provide fallback error message if status is failed/cancelled but no error details
  const mappedStatus = mapBytePlusStatus(response.status)
  const shouldHaveError = mappedStatus === 'failed'
  const errorMessage = response.error?.message || (shouldHaveError
    ? 'Video generation failed. Please try again or contact support if the issue persists.'
    : undefined)

  return {
    data: {
      id: response.id,
      status: mappedStatus,
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      error: errorMessage,
      progress: response.status === 'running' ? 50 : response.status === 'succeeded' ? 100 : 0,
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString(),
      lastFrameUrl: response.content?.last_frame_url,  // 映射视频结束帧 URL
    },
  }
}

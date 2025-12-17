import { VideoGenerationRequest, VideoStatusResponse } from '@/lib/types/video'
import { BytePlusContent, BytePlusVideoRequest, BytePlusVideoResponse, BytePlusVideoTaskStatus } from './types'

// 使用标准 Pro 模型（Pro-Fast 可能未开通访问权限）
const DEFAULT_VIDEO_MODEL = 'seedance-1-0-pro-250528'

/**
 * 将现有 VideoGenerationRequest 拼装为 BytePlus 的文本命令 prompt
 */
export function buildPromptWithCommands(request: VideoGenerationRequest): string {
  let prompt = request.prompt

  prompt += ` --resolution ${request.resolution}`
  prompt += ` --duration ${request.duration}`
  prompt += ` --ratio ${request.aspectRatio}`

  if (request.cameraFixed !== undefined) {
    prompt += ` --camerafixed ${request.cameraFixed}`
  }

  if (request.seed !== undefined && request.seed !== -1) {
    prompt += ` --seed ${request.seed}`
  }

  // 添加水印支持（默认 false）
  if (request.watermark !== undefined) {
    prompt += ` --watermark ${request.watermark}`
  }

  return prompt
}

/**
 * 将内部请求转换为 BytePlus 请求
 */
export function convertToBytePlusRequest(
  request: VideoGenerationRequest,
  options?: { callbackUrl?: string; returnLastFrame?: boolean }
): BytePlusVideoRequest {
  const content: BytePlusContent[] = []

  content.push({
    type: 'text',
    text: buildPromptWithCommands(request),
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

  return {
    model: DEFAULT_VIDEO_MODEL,
    content,
    callback_url: options?.callbackUrl,
    return_last_frame: options?.returnLastFrame ?? false,
  }
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
  return {
    data: {
      id: response.id,
      status: mapBytePlusStatus(response.status),
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      error: response.error?.message,
      progress: response.status === 'running' ? 50 : response.status === 'succeeded' ? 100 : 0,
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString(),
      lastFrameUrl: response.content?.last_frame_url,  // 映射视频结束帧 URL
    },
  }
}

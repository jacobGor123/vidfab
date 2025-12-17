import { BytePlusClient } from '../core/client'
import { BytePlusAPIError } from '../core/errors'
import { VideoGenerationRequest, VideoGenerationResponse, VideoStatusResponse } from '@/lib/types/video'
import { BytePlusVideoRequest, BytePlusVideoResponse, SubmitVideoResponse } from './types'
import { convertToBytePlusRequest, mapBytePlusResponseToStatus } from './utils'

const client = new BytePlusClient()

/**
 * 提交视频生成任务
 */
export async function submitVideoGeneration(
  request: VideoGenerationRequest,
  options?: { callbackUrl?: string; returnLastFrame?: boolean }
): Promise<VideoGenerationResponse> {
  const byteplusRequest: BytePlusVideoRequest = convertToBytePlusRequest(request, options)

  // 🔥 默认启用 return_last_frame（除非显式设置为 false）
  if (options?.returnLastFrame !== false) {
    byteplusRequest.return_last_frame = true
  }

  console.log('[BytePlus Video] submit', {
    model: byteplusRequest.model,
    hasImage: byteplusRequest.content.some(c => c.type === 'image_url'),
    callback: !!byteplusRequest.callback_url,
    returnLastFrame: byteplusRequest.return_last_frame,  // 🔥 新增日志
  })

  const response = await client.request<SubmitVideoResponse>(
    '/contents/generations/tasks',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest),
    }
  )

  return {
    data: {
      id: response.id,
    },
  }
}

/**
 * 查询视频生成状态
 */
export async function checkVideoStatus(taskId: string): Promise<VideoStatusResponse> {
  console.log('[BytePlus Video] Checking status for task:', taskId)

  let response: BytePlusVideoResponse
  try {
    response = await client.request<BytePlusVideoResponse>(
      `/contents/generations/tasks/${taskId}`,
      { method: 'GET' }
    )

    console.log('[BytePlus Video] Status response:', {
      taskId,
      status: response.status,
      hasOutputs: !!(response.outputs && response.outputs.length > 0),
      error: response.error
    })
  } catch (error) {
    console.error('[BytePlus Video] Failed to check status:', { taskId, error })
    // 透传 BytePlusAPIError 便于上层识别
    if (error instanceof BytePlusAPIError) {
      throw error
    }
    throw new BytePlusAPIError('Failed to fetch video status', undefined, 'UNKNOWN_ERROR', error)
  }

  const result = mapBytePlusResponseToStatus(response)

  console.log('[BytePlus Video] Mapped status:', {
    taskId,
    status: result.data.status,
    hasVideoUrl: !!result.data.outputs?.[0]
  })

  return result
}

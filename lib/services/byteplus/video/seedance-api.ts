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
  options?: { callbackUrl?: string; returnLastFrame?: boolean; generateAudio?: boolean }
): Promise<VideoGenerationResponse> {
  const byteplusRequest: BytePlusVideoRequest = convertToBytePlusRequest(request, options)

  // 🔥 默认启用 return_last_frame（除非显式设置为 false）
  if (options?.returnLastFrame !== false) {
    byteplusRequest.return_last_frame = true
  }

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
  let response: BytePlusVideoResponse
  try {
    response = await client.request<BytePlusVideoResponse>(
      `/contents/generations/tasks/${taskId}`,
      { method: 'GET' }
    )
  } catch (error) {
    console.error('[BytePlus Video] Failed to check status:', { taskId, error })
    // 透传 BytePlusAPIError 便于上层识别
    if (error instanceof BytePlusAPIError) {
      throw error
    }
    throw new BytePlusAPIError('Failed to fetch video status', undefined, 'UNKNOWN_ERROR', error)
  }

  const result = mapBytePlusResponseToStatus(response)

  return result
}

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

  console.log('[BytePlus Video] submit', {
    model: byteplusRequest.model,
    hasImage: byteplusRequest.content.some(c => c.type === 'image_url'),
    callback: !!byteplusRequest.callback_url,
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
  let response: BytePlusVideoResponse
  try {
    response = await client.request<BytePlusVideoResponse>(
      `/contents/generations/tasks/${taskId}`,
      { method: 'GET' }
    )
  } catch (error) {
    // 透传 BytePlusAPIError 便于上层识别
    if (error instanceof BytePlusAPIError) {
      throw error
    }
    throw new BytePlusAPIError('Failed to fetch video status', undefined, 'UNKNOWN_ERROR', error)
  }

  return mapBytePlusResponseToStatus(response)
}

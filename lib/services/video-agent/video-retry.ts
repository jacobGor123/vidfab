/**
 * Video Agent - Video Retry Service
 * 视频生成重试服务
 */

import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Shot, Storyboard, VideoClipResult, BatchVideoGenerationOptions } from '@/lib/types/video-agent'
import { buildVideoPrompt } from './video-prompt-builder'

/**
 * 重试单个视频生成
 * @param storyboard 分镜图
 * @param shot 分镜脚本
 * @param options 生成选项
 * @returns 视频片段结果
 */
export async function retryVideoGeneration(
  storyboard: Storyboard,
  shot: Shot,
  options: BatchVideoGenerationOptions
): Promise<VideoClipResult> {
  const {
    watermark = false,
    resolution = '1080p',
    model = 'vidfab-q1',
    aspectRatio = '16:9'
  } = options

  try {
    // 构建完整的视频生成 prompt
    const videoPrompt = buildVideoPrompt(shot)

    const videoRequest: VideoGenerationRequest = {
      image: storyboard.image_url,
      prompt: videoPrompt,
      model,
      duration: shot.duration_seconds,
      resolution,
      aspectRatio: aspectRatio,
      cameraFixed: true,
      watermark,
      seed: shot.seed ? shot.seed + 1 : undefined  // 使用不同的 seed
    }

    console.log(`[VideoAgent] 重试视频片段 ${shot.shot_number}`, {
      shot_number: shot.shot_number,
      new_seed: videoRequest.seed
    })

    const result = await submitVideoGeneration(videoRequest)

    return {
      shot_number: shot.shot_number,
      task_id: result.data.id,
      status: 'generating'
    }
  } catch (error: any) {
    console.error(`[VideoAgent] 视频片段 ${shot.shot_number} 重试失败:`, error)

    return {
      shot_number: shot.shot_number,
      status: 'failed',
      error: error.message || '重试失败'
    }
  }
}

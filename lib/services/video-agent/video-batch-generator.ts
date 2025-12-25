/**
 * Video Agent - Batch Video Generator
 * 批量视频生成服务
 */

import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Shot, Storyboard, VideoClipResult, BatchVideoGenerationOptions } from '@/lib/types/video-agent'
import { buildVideoPrompt } from './video-prompt-builder'

/**
 * 批量生成视频片段
 * @param storyboards 分镜图列表
 * @param shots 分镜脚本列表
 * @param options 生成选项
 * @returns 视频片段任务列表
 */
export async function batchGenerateVideos(
  storyboards: Storyboard[],
  shots: Shot[],
  options: BatchVideoGenerationOptions
): Promise<VideoClipResult[]> {
  const {
    watermark = false,
    resolution = '1080p',
    model = 'vidfab-q1',
    maxRetries = 2
  } = options

  // 创建并行任务
  const tasks = storyboards.map(async (storyboard, index) => {
    const shot = shots.find(s => s.shot_number === storyboard.shot_number)

    if (!shot) {
      return {
        shot_number: storyboard.shot_number,
        status: 'failed' as const,
        error: '未找到对应的分镜脚本'
      }
    }

    // 只处理成功生成的分镜图
    if (storyboard.status !== 'success') {
      return {
        shot_number: storyboard.shot_number,
        status: 'failed' as const,
        error: '分镜图生成失败,无法生成视频'
      }
    }

    try {
      // 构建完整的视频生成 prompt（包含场景、动作、情绪）
      const videoPrompt = buildVideoPrompt(shot)

      // 构建视频生成请求
      const videoRequest: VideoGenerationRequest = {
        image: storyboard.image_url,
        prompt: videoPrompt,
        model,
        duration: shot.duration_seconds,
        resolution,
        aspectRatio: '16:9',
        cameraFixed: true,  // 单镜头模式 - 禁用自动多镜头切换
        watermark,
        seed: shot.seed
      }

      console.log(`[VideoAgent] 正在生成视频片段 ${shot.shot_number}/${storyboards.length}`, {
        shot_number: shot.shot_number,
        duration: shot.duration_seconds,
        cameraFixed: true,
        videoPrompt: videoPrompt
      })

      // 调用现有的视频生成 API
      const result = await submitVideoGeneration(videoRequest)

      return {
        shot_number: shot.shot_number,
        task_id: result.data.id,
        status: 'generating' as const,
        retry_count: 0
      }
    } catch (error: any) {
      console.error(`[VideoAgent] 视频片段 ${shot.shot_number} 生成失败:`, error)

      return {
        shot_number: shot.shot_number,
        status: 'failed' as const,
        error: error.message || '视频生成提交失败',
        retry_count: 0
      }
    }
  })

  // 等待所有任务提交完成
  const results = await Promise.allSettled(tasks)

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : {
          shot_number: -1,
          status: 'failed' as const,
          error: '任务提交异常'
        }
  )
}

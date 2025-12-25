/**
 * Video Agent - Video Transition Generator
 * 链式视频生成服务（使用首尾帧过渡）
 */

import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Shot, Storyboard, VideoClipResult, BatchVideoGenerationOptions } from '@/lib/types/video-agent'
import { buildVideoPrompt } from './video-prompt-builder'
import { pollVideoStatus } from './video-polling'

/**
 * 链式生成视频片段（使用首尾帧过渡）
 *
 * 关键特性：
 * 1. 顺序生成（非并行）- 确保每个片段都能使用上一个片段的末尾帧
 * 2. 第一个片段使用分镜图，后续片段使用前一个片段的末尾帧
 * 3. 如果某个片段失败，终止后续生成（避免链条断裂）
 *
 * @param storyboards 分镜图列表
 * @param shots 分镜脚本列表
 * @param options 生成选项
 * @returns 视频片段任务列表
 */
export async function batchGenerateVideosWithTransition(
  storyboards: Storyboard[],
  shots: Shot[],
  options: BatchVideoGenerationOptions
): Promise<VideoClipResult[]> {
  const {
    watermark = false,
    resolution = '1080p',
    model = 'vidfab-q1',
    aspectRatio = '16:9'
  } = options

  const results: VideoClipResult[] = []
  let previousLastFrameUrl: string | undefined = undefined

  console.log('[VideoAgent] 开始链式生成视频片段', {
    totalShots: storyboards.length,
    mode: 'sequential_with_transition'
  })

  // 关键：顺序生成（而非并行）
  for (let i = 0; i < storyboards.length; i++) {
    const storyboard = storyboards[i]
    const shot = shots.find(s => s.shot_number === storyboard.shot_number)

    if (!shot || storyboard.status !== 'success') {
      const error = !shot ? '未找到对应的分镜脚本' : '分镜图生成失败'
      console.error(`[VideoAgent] 片段 ${storyboard.shot_number} 跳过:`, error)

      results.push({
        shot_number: storyboard.shot_number,
        status: 'failed',
        error
      })
      continue
    }

    try {
      // 第一个片段：使用分镜图
      // 后续片段：使用上一个片段的末尾帧
      const firstFrameUrl = i === 0 ? storyboard.image_url : previousLastFrameUrl

      if (!firstFrameUrl) {
        throw new Error(`片段 ${shot.shot_number} 缺少首帧图像（上一个片段可能未返回末尾帧）`)
      }

      // 构建视频生成 Prompt
      const videoPrompt = buildVideoPrompt(shot)

      // 构建视频生成请求
      const videoRequest: VideoGenerationRequest = {
        image: firstFrameUrl,  // 使用链式首帧
        prompt: videoPrompt,
        model,
        duration: shot.duration_seconds,
        resolution,
        aspectRatio,
        cameraFixed: true,  // 单镜头模式
        watermark,
        seed: shot.seed
      }

      console.log(`[VideoAgent] 生成片段 ${i + 1}/${storyboards.length}`, {
        shot_number: shot.shot_number,
        firstFrameSource: i === 0 ? 'storyboard' : 'previous_last_frame',
        firstFrameUrl: firstFrameUrl.substring(0, 60) + '...',
        duration: shot.duration_seconds
      })

      // 提交生成任务（return_last_frame 默认启用）
      const submitResult = await submitVideoGeneration(videoRequest, {
        returnLastFrame: true
      })

      console.log(`[VideoAgent] 片段 ${shot.shot_number} 任务已提交，等待完成...`, {
        task_id: submitResult.data.id
      })

      // 轮询等待完成
      const pollResult = await pollVideoStatus(submitResult.data.id)

      if (pollResult.status === 'failed') {
        throw new Error(pollResult.error || '视频生成失败')
      }

      // 保存末尾帧 URL，供下一个片段使用
      previousLastFrameUrl = pollResult.lastFrameUrl

      results.push({
        shot_number: shot.shot_number,
        task_id: submitResult.data.id,
        video_url: pollResult.video_url,
        lastFrameUrl: pollResult.lastFrameUrl,
        status: 'completed'
      })

      console.log(`[VideoAgent] 片段 ${shot.shot_number} 完成 ✓`, {
        video_url: pollResult.video_url?.substring(0, 60) + '...',
        hasLastFrame: !!pollResult.lastFrameUrl,
        lastFrameUrl: pollResult.lastFrameUrl?.substring(0, 60) + '...'
      })

    } catch (error: any) {
      console.error(`[VideoAgent] 片段 ${shot.shot_number} 生成失败:`, error)

      results.push({
        shot_number: shot.shot_number,
        status: 'failed',
        error: error.message || '视频生成失败'
      })

      // 生成失败时，终止后续片段（因为链条断裂）
      const remainingCount = storyboards.length - i - 1
      if (remainingCount > 0) {
        console.warn(`[VideoAgent] ⚠️ 链式生成中断，剩余 ${remainingCount} 个片段将跳过`)

        // 标记剩余片段为失败
        for (let j = i + 1; j < storyboards.length; j++) {
          results.push({
            shot_number: storyboards[j].shot_number,
            status: 'failed',
            error: '前序片段生成失败，链条中断'
          })
        }
      }

      break  // 终止循环
    }
  }

  console.log('[VideoAgent] 链式生成完成', {
    total: storyboards.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length
  })

  return results
}

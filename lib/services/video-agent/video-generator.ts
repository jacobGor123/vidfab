/**
 * Video Agent - 批量视频生成服务
 * 复用现有的 Seedance API,支持批量并行生成和状态轮询
 */

import { submitVideoGeneration, checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest, VideoStatusResponse } from '@/lib/types/video'

/**
 * 构建视频生成 Prompt
 * 结合场景描述、角色动作、镜头角度、情绪氛围
 */
function buildVideoPrompt(shot: Shot): string {
  let prompt = ''

  // 1. 场景描述（核心内容）
  prompt += shot.description

  // 2. 角色动作（具体行为）
  if (shot.character_action) {
    prompt += `. ${shot.character_action}`
  }

  // 3. 镜头角度（视觉引导）
  if (shot.camera_angle) {
    prompt += `. ${shot.camera_angle}`
  }

  // 4. 情绪氛围（情感基调）
  if (shot.mood) {
    prompt += `. Mood: ${shot.mood}`
  }

  // 5. 运动提示（确保视频有动态）
  prompt += '. Smooth camera movement, natural motion, cinematic.'

  return prompt
}

export interface Shot {
  shot_number: number
  time_range: string
  description: string
  camera_angle: string
  character_action: string
  mood: string
  duration_seconds: number
  seed?: number
}

export interface Storyboard {
  id: string
  shot_number: number
  image_url: string
  status: 'generating' | 'success' | 'failed'
}

export interface VideoClipResult {
  shot_number: number
  task_id?: string
  video_url?: string
  lastFrameUrl?: string  // 🔥 新增：末尾帧 URL，用于下一个片段的首帧
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
  retry_count?: number
}

export interface BatchVideoGenerationOptions {
  userId: string
  watermark?: boolean
  resolution?: '480p' | '720p' | '1080p'
  model?: string
  maxRetries?: number
  aspectRatio?: '16:9' | '9:16'
}

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
        cameraFixed: true,  // 🔥 单镜头模式 - 禁用自动多镜头切换
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

/**
 * 轮询单个视频生成状态
 * @param taskId 任务 ID
 * @param maxAttempts 最大轮询次数
 * @param intervalMs 轮询间隔(毫秒)
 * @returns 视频生成结果
 */
export async function pollVideoStatus(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{
  video_url: string
  lastFrameUrl?: string  // 🔥 新增：末尾帧 URL
  status: 'completed' | 'failed'
  error?: string
}> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkVideoStatus(taskId)

      console.log(`[VideoAgent] 轮询视频状态 (${i + 1}/${maxAttempts}):`, {
        taskId,
        status: status.data.status,
        progress: status.data.progress
      })

      if (status.data.status === 'completed') {
        if (!status.data.outputs || status.data.outputs.length === 0) {
          throw new Error('视频生成完成但未返回视频 URL')
        }

        return {
          video_url: status.data.outputs[0],
          lastFrameUrl: status.data.lastFrameUrl,  // 🔥 返回末尾帧
          status: 'completed'
        }
      }

      if (status.data.status === 'failed') {
        return {
          video_url: '',
          status: 'failed',
          error: status.data.error || '视频生成失败'
        }
      }

      // 等待下次轮询
      await sleep(intervalMs)
    } catch (error: any) {
      console.error(`[VideoAgent] 轮询视频状态失败 (${i + 1}/${maxAttempts}):`, error)

      // 如果是最后一次尝试,抛出错误
      if (i === maxAttempts - 1) {
        return {
          video_url: '',
          status: 'failed',
          error: error.message || '视频状态查询失败'
        }
      }

      // 否则等待后继续
      await sleep(intervalMs)
    }
  }

  // 超时
  return {
    video_url: '',
    status: 'failed',
    error: '视频生成超时(5分钟)'
  }
}

/**
 * 批量轮询视频生成状态
 * @param clips 视频片段任务列表
 * @param onProgress 进度回调函数
 * @returns 完成的视频片段列表
 */
export async function pollBatchVideoStatus(
  clips: VideoClipResult[],
  onProgress?: (completedCount: number, totalCount: number) => void
): Promise<VideoClipResult[]> {
  const tasks = clips.map(async (clip) => {
    // 跳过已失败或没有 task_id 的片段
    if (clip.status === 'failed' || !clip.task_id) {
      return clip
    }

    try {
      const result = await pollVideoStatus(clip.task_id)

      // 通知进度
      if (onProgress) {
        const completedClips = clips.filter(c => c.status === 'completed' || c.status === 'failed')
        onProgress(completedClips.length + 1, clips.length)
      }

      return {
        ...clip,
        video_url: result.video_url,
        lastFrameUrl: result.lastFrameUrl,  // 🔥 保存末尾帧
        status: result.status,
        error: result.error
      }
    } catch (error: any) {
      console.error(`[VideoAgent] 片段 ${clip.shot_number} 状态轮询失败:`, error)

      return {
        ...clip,
        status: 'failed' as const,
        error: error.message || '状态查询失败'
      }
    }
  })

  const results = await Promise.allSettled(tasks)

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : {
          shot_number: -1,
          status: 'failed' as const,
          error: '状态轮询异常'
        }
  )
}

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

/**
 * 🔥 链式生成视频片段（使用首尾帧过渡）
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

  // 🔥 关键：顺序生成（而非并行）
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
      // 🔥 第一个片段：使用分镜图
      // 🔥 后续片段：使用上一个片段的末尾帧
      const firstFrameUrl = i === 0 ? storyboard.image_url : previousLastFrameUrl

      if (!firstFrameUrl) {
        throw new Error(`片段 ${shot.shot_number} 缺少首帧图像（上一个片段可能未返回末尾帧）`)
      }

      // 构建视频生成 Prompt
      const videoPrompt = buildVideoPrompt(shot)

      // 构建视频生成请求
      const videoRequest: VideoGenerationRequest = {
        image: firstFrameUrl,  // 🔥 使用链式首帧
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

      // 🔥 提交生成任务（return_last_frame 默认启用）
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

      // 🔥 保存末尾帧 URL，供下一个片段使用
      previousLastFrameUrl = pollResult.lastFrameUrl

      results.push({
        shot_number: shot.shot_number,
        task_id: submitResult.data.id,
        video_url: pollResult.video_url,
        lastFrameUrl: pollResult.lastFrameUrl,  // 🔥 保存末尾帧
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

      // 🔥 生成失败时，终止后续片段（因为链条断裂）
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

/**
 * 辅助函数: 延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

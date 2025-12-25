/**
 * Video Agent - Video Status Polling
 * 视频生成状态轮询
 */

import { checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import type { VideoClipResult } from '@/lib/types/video-agent'

/**
 * 辅助函数: 延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  lastFrameUrl?: string
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
          lastFrameUrl: status.data.lastFrameUrl,
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
        lastFrameUrl: result.lastFrameUrl,
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

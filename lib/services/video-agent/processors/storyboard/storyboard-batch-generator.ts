/**
 * Storyboard Generator - 批量生成逻辑
 */

import pLimit from 'p-limit'
import type { CharacterConfig, Shot, ImageStyle, StoryboardResult } from '@/lib/types/video-agent'
import { generateSingleStoryboard } from './storyboard-core'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: {
  percent: number
  message: string
  completed: number
  failed: number
  total: number
  currentShot?: number
}) => void

/**
 * 批量生成结果
 */
export interface BatchGenerationResult {
  success: boolean
  total: number
  completed: number
  failed: number
  finalStatus: 'completed' | 'failed' | 'partial'
}

/**
 * 批量生成分镜图（简单版，无数据库更新）
 */
export async function batchGenerateStoryboards(
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle
): Promise<StoryboardResult[]> {
  console.log('[Storyboard Batch Generator] Starting batch generation', {
    shotCount: shots.length,
    characterCount: characters.length,
    style: style.name
  })

  // 并行生成所有分镜图,允许部分失败
  const tasks = shots.map(shot =>
    generateSingleStoryboard(shot, characters, style)
  )

  const results = await Promise.allSettled(tasks)

  // 转换结果
  const storyboards = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`Shot ${index + 1} failed:`, result.reason)
      return {
        shot_number: index + 1,
        status: 'failed' as const,
        error: result.reason?.message || 'Unknown error'
      }
    }
  })

  const successCount = storyboards.filter(s => s.status === 'success').length

  console.log('[Storyboard Batch Generator] Batch generation completed', {
    total: shots.length,
    success: successCount,
    failed: shots.length - successCount
  })

  return storyboards
}

/**
 * 批量生成分镜图（完整版，带进度回调和数据库更新）
 *
 * @param projectId - 项目 ID
 * @param shots - 分镜列表
 * @param characters - 人物配置
 * @param style - 图片风格
 * @param aspectRatio - 宽高比
 * @param onProgress - 进度回调（可选）
 * @returns 生成结果
 */
export async function batchGenerateStoryboardsWithProgress(
  projectId: string,
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9',
  onProgress?: ProgressCallback
): Promise<BatchGenerationResult> {
  const CONCURRENCY = parseInt(process.env.STORYBOARD_CONCURRENCY || '3', 10)

  console.log('[Storyboard Batch Generator] Starting async generation with progress', {
    projectId,
    shotCount: shots.length,
    aspectRatio,
    concurrency: CONCURRENCY
  })

  let successCount = 0
  let failedCount = 0

  // 报告初始进度
  onProgress?.({
    percent: 0,
    message: '开始生成分镜图...',
    completed: 0,
    failed: 0,
    total: shots.length
  })

  // 使用 p-limit 控制并发
  const limit = pLimit(CONCURRENCY)

  const tasks = shots.map((shot) =>
    limit(async () => {
      try {
        console.log('[Storyboard Batch Generator] 🎬 Generating shot', {
          shotNumber: shot.shot_number,
          progress: `${successCount + failedCount + 1}/${shots.length}`
        })

        // 报告当前进度
        const currentProgress = successCount + failedCount
        onProgress?.({
          percent: Math.round((currentProgress / shots.length) * 90),
          message: `正在生成第 ${shot.shot_number} 张分镜...`,
          completed: successCount,
          failed: failedCount,
          total: shots.length,
          currentShot: shot.shot_number
        })

        // 生成分镜
        const result = await generateSingleStoryboard(shot, characters, style, aspectRatio)

        // 立即更新数据库
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            image_url: result.image_url,
            status: result.status,
            error_message: result.error,
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        if (result.status === 'success') {
          successCount++
        } else {
          failedCount++
        }

        console.log('[Storyboard Batch Generator] ✅ Shot generated', {
          shotNumber: shot.shot_number,
          status: result.status,
          progress: `${successCount + failedCount}/${shots.length}`
        })

        // 报告完成进度
        const completedProgress = successCount + failedCount
        onProgress?.({
          percent: Math.round((completedProgress / shots.length) * 90),
          message: `已完成 ${completedProgress}/${shots.length} 张分镜`,
          completed: successCount,
          failed: failedCount,
          total: shots.length
        })

        return result
      } catch (error) {
        failedCount++
        console.error('[Storyboard Batch Generator] ❌ Generation failed:', error)

        // 更新为失败状态
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        // 报告失败进度
        const completedProgress = successCount + failedCount
        onProgress?.({
          percent: Math.round((completedProgress / shots.length) * 90),
          message: `已完成 ${completedProgress}/${shots.length} 张分镜（${failedCount} 张失败）`,
          completed: successCount,
          failed: failedCount,
          total: shots.length
        })

        return null
      }
    })
  )

  // 等待所有任务完成
  await Promise.allSettled(tasks)

  // 报告进度：95%
  onProgress?.({
    percent: 95,
    message: '正在更新项目状态...',
    completed: successCount,
    failed: failedCount,
    total: shots.length
  })

  // 更新项目状态
  const finalStatus = failedCount === 0 ? 'completed' : failedCount === shots.length ? 'failed' : 'partial'
  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      step_3_status: finalStatus,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', projectId)

  console.log('[Storyboard Batch Generator] Generation completed', {
    projectId,
    total: shots.length,
    success: successCount,
    failed: failedCount,
    finalStatus
  })

  // 报告最终进度：100%
  onProgress?.({
    percent: 100,
    message: finalStatus === 'completed' ? '全部分镜生成完成！' :
             finalStatus === 'failed' ? '分镜生成失败' :
             `分镜生成完成（${successCount} 成功，${failedCount} 失败）`,
    completed: successCount,
    failed: failedCount,
    total: shots.length
  })

  return {
    success: finalStatus !== 'failed',
    total: shots.length,
    completed: successCount,
    failed: failedCount,
    finalStatus
  }
}

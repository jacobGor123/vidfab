/**
 * Storyboard Generator - 批量生成逻辑
 */

import type { CharacterConfig, Shot, ImageStyle, StoryboardResult } from '@/lib/types/video-agent'
import { generateSingleStoryboard } from './storyboard-core'

/**
 * 批量生成分镜图
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

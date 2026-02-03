/**
 * Storyboard Generator - 批量生成逻辑
 */

import pLimit from 'p-limit'
import type { CharacterConfig, Shot, ImageStyle, StoryboardResult } from '@/lib/types/video-agent'
import { generateSingleStoryboard } from './storyboard-core'
import { supabaseAdmin } from '@/lib/supabase'

// IMPORTANT:
// Do not enqueue downloads from the generator layer.
// All downloads must be triggered by explicit routes or worker jobs to avoid
// "queue unavailable -> direct download" fallbacks and keep SSRF controls centralized.

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

        // 🔥 增强的角色匹配逻辑（多层防护）
        // 策略1: 优先从文本中提取（更准确，因为 character-replace API 已更新文本）
        // 策略2: 如果文本提取为空，再使用 shot.characters（可能包含别名）
        // 策略3: 增强别名匹配能力
        // 策略4: 只在确实找不到时才使用"所有角色"，并记录警告

        const sceneText = `${shot.description} ${shot.character_action}`.toLowerCase()
        let shotCharacters: string[] = []

        // 🔥 策略1: 优先从文本中提取角色（最准确）
        if (characters.length > 0) {
          const mentionedCharacters = characters
            .filter(char => {
              const shortName = char.name.split('(')[0].trim().toLowerCase()
              return sceneText.includes(shortName)
            })
            .map(char => char.name)

          if (mentionedCharacters.length > 0) {
            shotCharacters = mentionedCharacters
            console.log('[Storyboard Batch Generator] ✅ Strategy 1: Extracted characters from text for shot', shot.shot_number, ':', mentionedCharacters)
          }
        }

        // 🔥 策略2: 如果文本提取为空，使用 shot.characters 作为备用
        if (shotCharacters.length === 0 && shot.characters && shot.characters.length > 0) {
          shotCharacters = shot.characters
          console.log('[Storyboard Batch Generator] 📋 Strategy 2: Using shot.characters for shot', shot.shot_number, ':', shotCharacters)
        }

        // 🔥 策略3: 使用增强的别名匹配（支持 "the dog", "the orange cat" 等别名）
        let relevantCharacters = characters.filter(char => {
          const shortCharName = char.name.split('(')[0].trim().toLowerCase()

          return shotCharacters.some(shotChar => {
            const shortShotChar = shotChar.split('(')[0].trim().toLowerCase()

            // 精确匹配
            if (shortCharName === shortShotChar) {
              return true
            }

            // 🔥 增强：使用别名匹配
            // 生成该角色的所有可能别名（例如 "dog" -> ["dog", "the dog"]）
            const aliases = toGenericAliases(char.name)
            if (aliases.includes(shortShotChar)) {
              console.log('[Storyboard Batch Generator] 🔗 Alias matched:', {
                shot: shot.shot_number,
                character: char.name,
                alias: shortShotChar
              })
              return true
            }

            return false
          })
        })

        // 🔥 策略4: 只在确实找不到时才使用"所有角色"（最后的备用方案）
        if (relevantCharacters.length === 0 && characters.length > 0) {
          console.warn('[Storyboard Batch Generator] ⚠️ Strategy 4: No character match for shot', shot.shot_number, {
            sceneText: sceneText.slice(0, 100),
            shotCharacters,
            availableCharacters: characters.map(c => c.name),
            fallback: 'using all characters'
          })
          relevantCharacters = characters
        }

        // 🔥 辅助函数：生成角色的所有可能别名
        function toGenericAliases(name: string): string[] {
          const n = name.split('(')[0].trim().toLowerCase()
          if (!n) return []
          const aliases = new Set<string>()

          const species = ['cat', 'dog', 'tiger', 'lion', 'bear', 'cow', 'horse', 'duck', 'chicken', 'sheep', 'pig']
          for (const s of species) {
            if (n.includes(s)) {
              aliases.add(`the ${s}`)
              aliases.add(s)
            }
          }

          if (n === 'orange cat' || (n.includes('cat') && n.includes('orange'))) {
            aliases.add('the orange cat')
            aliases.add('orange cat')
          }

          const colors = ['orange', 'black', 'white', 'brown', 'gray', 'grey', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gold', 'silver']
          for (const s of species) {
            for (const c of colors) {
              if (n.includes(s) && n.includes(c)) {
                aliases.add(`${c} ${s}`)
                aliases.add(`the ${c} ${s}`)
              }
            }
          }

          return Array.from(aliases)
        }

        console.log('[Storyboard Batch Generator] 📊 Character matching result for shot', shot.shot_number, {
          allCharacters: characters.map(c => c.name),
          shotCharacters,
          relevantCharacters: relevantCharacters.map(c => c.name),
          matchRate: `${relevantCharacters.length}/${characters.length}`,
          usingFallback: relevantCharacters.length === characters.length && shotCharacters.length > 0
        })

        // 生成分镜（只传递相关角色）
        const result = await generateSingleStoryboard(shot, relevantCharacters, style, aspectRatio)

        // 立即更新数据库
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            image_url: result.image_url,
            image_url_external: result.image_url, // 保存外部 URL
            status: result.status,
            error_message: result.error,
            storage_status: 'pending', // 标记为待下载
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        if (result.status === 'success') {
          successCount++

          // NOTE: do not enqueue downloads from here.
          // Download is handled by dedicated routes/worker jobs to avoid fallback direct-download.
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

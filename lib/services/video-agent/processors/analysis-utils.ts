/**
 * Analysis Utils - 分析工具函数（共享模块）
 *
 * 🔥 这个模块存放文本脚本分析和视频分析共用的工具函数
 * 避免代码重复，保持单一数据源原则（Single Source of Truth）
 */

import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { UNIFIED_SEGMENT_DURATION } from './script/constants'

/**
 * 规范化描述文本（用于去重检测）
 * - 去除首尾空格
 * - 转为小写
 * - 合并多个空格为一个
 */
export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * 检测重复的镜头描述（返回详细信息）
 *
 * 🔥 这是防止 LLM 退化的关键检测机制
 *
 * @param analysis 脚本分析结果
 * @returns 重复信息对象
 */
export function getDuplicateShotDescriptions(analysis: ScriptAnalysisResult): {
  hasDuplicates: boolean
  duplicateCount: number
  duplicateShots: Array<{ description: string; shotNumbers: number[] }>
} {
  const descriptionMap = new Map<string, number[]>()

  for (const shot of analysis.shots || []) {
    const normalized = normalizeDescription(shot.description || '')
    if (!normalized) continue

    const existing = descriptionMap.get(normalized) || []
    existing.push(shot.shot_number)
    descriptionMap.set(normalized, existing)
  }

  // 找出所有重复的描述
  const duplicates = Array.from(descriptionMap.entries())
    .filter(([_, shotNumbers]) => shotNumbers.length > 1)
    .map(([description, shotNumbers]) => ({ description, shotNumbers }))

  return {
    hasDuplicates: duplicates.length > 0,
    duplicateCount: duplicates.length,
    duplicateShots: duplicates
  }
}

/**
 * 检测是否存在重复的镜头描述（简化版）
 *
 * @param analysis 脚本分析结果
 * @returns 如果存在重复描述返回 true，否则返回 false
 */
export function hasDuplicateShotDescriptions(analysis: ScriptAnalysisResult): boolean {
  return getDuplicateShotDescriptions(analysis).hasDuplicates
}

/**
 * 自动去除重复的镜头描述
 *
 * 🔥 保留第一次出现的镜头，删除后续重复的
 * 🔥 重新计算 shot_number、time_range、duration
 *
 * @param analysis 脚本分析结果
 * @returns 去重后的镜头列表和统计信息
 */
export function removeDuplicateShotDescriptions(analysis: ScriptAnalysisResult): {
  uniqueShots: typeof analysis.shots
  removedCount: number
  originalCount: number
  removedShotNumbers: number[]
} {
  const seen = new Set<string>()
  const uniqueShots: typeof analysis.shots = []
  const removedShotNumbers: number[] = []

  for (const shot of analysis.shots || []) {
    const normalized = normalizeDescription(shot.description || '')
    if (!normalized) {
      uniqueShots.push(shot)
      continue
    }

    if (seen.has(normalized)) {
      // 重复镜头，跳过
      removedShotNumbers.push(shot.shot_number)
      continue
    }

    seen.add(normalized)
    uniqueShots.push(shot)
  }

  // 重新编号镜头
  uniqueShots.forEach((shot, index) => {
    shot.shot_number = index + 1
  })

  // 🔥 重新计算时间范围（假设每个镜头的时长不变）
  let currentTime = 0
  uniqueShots.forEach(shot => {
    const duration = shot.duration_seconds || 5
    shot.time_range = `${currentTime.toFixed(1)}-${(currentTime + duration).toFixed(1)}s`
    currentTime += duration
  })

  return {
    uniqueShots,
    removedCount: removedShotNumbers.length,
    originalCount: analysis.shots?.length || 0,
    removedShotNumbers
  }
}

/**
 * 修正角色数组（基于全局角色列表和 description 自动匹配）
 *
 * 🔥 LLM 生成的 characters 数组可能不准确，需要基于 description 重新匹配
 *
 * @param analysis 脚本分析结果
 * @returns 被修正的镜头编号列表
 */
export function fixCharacterArrays(analysis: ScriptAnalysisResult): string[] {
  const allCharacters = analysis.characters || []
  const fixedShots: string[] = []

  analysis.shots.forEach(shot => {
    // 将 description 和 character_action 转为小写用于匹配
    const descLower = (shot.description + ' ' + shot.character_action).toLowerCase()

    // 重新生成该分镜的 characters 数组（基于全局角色列表）
    const matchedCharacters: string[] = []

    allCharacters.forEach(charName => {
      // 🔥 提取角色名称的简短形式（括号前的部分）
      // 例如: "Mira (Asian woman, 20s...)" → "Mira"
      const shortName = charName.split('(')[0].trim()
      const shortNameLower = shortName.toLowerCase()

      // 如果 description 中提到了这个角色的简短名称，加入该分镜的 characters 数组
      if (descLower.includes(shortNameLower)) {
        matchedCharacters.push(charName)
      }
    })

    // 如果重新匹配的结果与原 Gemini 生成的不同，记录并覆盖
    const originalChars = shot.characters || []
    if (JSON.stringify(matchedCharacters.sort()) !== JSON.stringify(originalChars.sort())) {
      fixedShots.push(
        `Shot ${shot.shot_number}: ${originalChars.join(', ') || 'none'} → ${matchedCharacters.join(', ') || 'none'}`
      )
      shot.characters = matchedCharacters
    }
  })

  return fixedShots
}

/**
 * 统一分镜时长（强制设置为固定时长）
 *
 * ⚠️ 注意：此函数会修改 analysis 对象
 *
 * 🔥 使用场景：
 * - 文本脚本分析：强制统一为 5 秒
 * - YouTube 复刻：禁用此函数（保留原视频真实时长）
 *
 * @param analysis 脚本分析结果
 */
export function unifySegmentDuration(analysis: ScriptAnalysisResult): void {
  analysis.shots = analysis.shots.map((shot, index) => ({
    ...shot,
    duration_seconds: UNIFIED_SEGMENT_DURATION,
    time_range: `${index * UNIFIED_SEGMENT_DURATION}-${(index + 1) * UNIFIED_SEGMENT_DURATION}s`
  }))

  // 重新计算总时长
  const actualTotalDuration = analysis.shots.length * UNIFIED_SEGMENT_DURATION
  analysis.duration = actualTotalDuration

  // 🔥 强制对齐 shot_count，避免 shots.length 与 shot_count 偶尔不一致
  analysis.shot_count = analysis.shots.length
}

/**
 * 清理 JSON 响应内容（移除可能的 markdown 标记）
 *
 * 🔥 Gemini 有时会返回包含 markdown 代码块的 JSON
 *
 * @param content 原始响应内容
 * @returns 清理后的 JSON 字符串
 */
export function cleanJsonResponse(content: string): string {
  let cleanContent = content.trim()

  // 移除可能的 markdown 代码块标记
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '')
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '')
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.replace(/\s*```$/, '')
  }

  // 🔥 策略2：如果第一个字符不是 {，说明前面有额外文本
  // 提取第一个 { 到最后一个 } 之间的内容
  const firstBrace = cleanContent.indexOf('{')
  const lastBrace = cleanContent.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    cleanContent = cleanContent.substring(firstBrace, lastBrace + 1)
  }

  // 🔥 策略3：修复常见的 JSON 语法错误
  // 移除尾随逗号（在数组或对象的最后一个元素后）
  cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1')

  // 移除注释（单行和多行）
  cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '')  // 多行注释
  cleanContent = cleanContent.replace(/\/\/.*/g, '')  // 单行注释

  // 🔥 策略4：使用 jsonrepair 库自动修复 JSON 语法错误
  // 这个库可以处理：缺少逗号、引号、括号不匹配等问题
  try {
    const { jsonrepair } = require('jsonrepair')
    cleanContent = jsonrepair(cleanContent)
  } catch (repairError) {
    // 如果 jsonrepair 失败，继续使用原来的清理结果
    console.warn('[Analysis Utils] JSON repair failed, using basic cleaning:', (repairError as Error).message)
  }

  return cleanContent.trim()
}

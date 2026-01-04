/**
 * Script Analyzer - 结果验证器
 */

import type { ScriptAnalysisResult } from '@/lib/types/video-agent'

/**
 * 验证分析结果
 */
export function validateAnalysisResult(analysis: ScriptAnalysisResult): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 🔥 YouTube 视频复刻模式：允许 1-60 秒的任意整数
  if (!analysis.duration || typeof analysis.duration !== 'number' || analysis.duration < 1 || analysis.duration > 60) {
    errors.push('Invalid duration')
  }

  if (!analysis.shots || !Array.isArray(analysis.shots)) {
    errors.push('Shots must be an array')
  }

  if (analysis.shots && analysis.shots.length === 0) {
    errors.push('At least one shot is required')
  }

  // shot_count 必须等于 shots.length
  if (analysis.shots && typeof analysis.shot_count === 'number' && analysis.shot_count !== analysis.shots.length) {
    errors.push(`shot_count mismatch: expected ${analysis.shots.length}, got ${analysis.shot_count}`)
  }

  if (analysis.shots) {
    const normalizedDescriptions = new Map<string, number[]>()
    analysis.shots.forEach((shot, index) => {
      if (!shot.shot_number || shot.shot_number !== index + 1) {
        errors.push(`Shot ${index + 1}: Invalid shot number`)
      }
      if (!shot.description || shot.description.trim() === '') {
        errors.push(`Shot ${index + 1}: Description is required`)
      }

       // 检测完全重复的 description（常见 LLM 退化表现）
       const normalized = (shot.description || '').trim().toLowerCase().replace(/\s+/g, ' ')
       if (normalized) {
         const existing = normalizedDescriptions.get(normalized) || []
         existing.push(shot.shot_number)
         normalizedDescriptions.set(normalized, existing)
       }

      if (!shot.duration_seconds || shot.duration_seconds <= 0) {
        errors.push(`Shot ${index + 1}: Invalid duration`)
      }
    })

    // 如果有任意重复 description，直接判为 invalid
    const duplicates = Array.from(normalizedDescriptions.entries())
      .filter(([, shotNumbers]) => shotNumbers.length > 1)
      .map(([, shotNumbers]) => shotNumbers)

    duplicates.forEach(shotNumbers => {
      errors.push(`Duplicate shot descriptions detected: shots ${shotNumbers.join(', ')}`)
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

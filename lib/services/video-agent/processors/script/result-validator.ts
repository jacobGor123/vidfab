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

  if (analysis.shots) {
    analysis.shots.forEach((shot, index) => {
      if (!shot.shot_number || shot.shot_number !== index + 1) {
        errors.push(`Shot ${index + 1}: Invalid shot number`)
      }
      if (!shot.description || shot.description.trim() === '') {
        errors.push(`Shot ${index + 1}: Description is required`)
      }
      if (!shot.duration_seconds || shot.duration_seconds <= 0) {
        errors.push(`Shot ${index + 1}: Invalid duration`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

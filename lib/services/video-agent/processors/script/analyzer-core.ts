/**
 * Script Analyzer - 分析核心逻辑
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { buildScriptAnalysisPrompt } from './prompt-builder'
import { MODEL_NAME, UNIFIED_SEGMENT_DURATION, SHOT_COUNT_MAP, sleep } from './constants'
import {
  cleanJsonResponse,
  getDuplicateShotDescriptions,
  removeDuplicateShotDescriptions,
  fixCharacterArrays,
  unifySegmentDuration
} from '../analysis-utils'

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * 分析脚本（使用 Google Generative AI）
 * @param script 用户输入的脚本
 * @param duration 视频时长 (15/30/45/60)
 * @param storyStyle 剧情风格
 * @returns 结构化分镜数据
 */
export async function analyzeScript(
  script: string,
  duration: number,
  storyStyle: string
): Promise<ScriptAnalysisResult> {
  console.log('[Script Analyzer Core] Starting analysis with gemini-3-flash-preview', {
    scriptLength: script.length,
    duration,
    storyStyle
  })

  const prompt = buildScriptAnalysisPrompt(script, duration, storyStyle)

  // 最多重试 3 次（遇到 429 限流或响应截断时）
  let retries = 0
  const maxRetries = 3

  while (retries <= maxRetries) {
    try {
      // 获取模型
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          temperature: 0.2,  // 适中的创造性，避免重复
          topP: 0.9,
          maxOutputTokens: 65536,
        }
      })

      // 调用 Gemini API
      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()

      if (!content) {
        throw new Error('Empty response from Gemini')
      }

      console.log('[Script Analyzer Core] Received response from Gemini:', {
        contentLength: content.length,
        preview: content.substring(0, 200)
      })

      // 清理响应内容
      const cleanContent = cleanJsonResponse(content)

      // 解析 JSON
      let analysis: ScriptAnalysisResult
      try {
        analysis = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('[Script Analyzer Core] JSON parse error:', parseError)
        console.error('[Script Analyzer Core] Raw content:', content)
        console.error('[Script Analyzer Core] Cleaned content:', cleanContent)
        throw new Error('Invalid JSON response from Gemini')
      }

      // 验证结果
      if (!analysis.shots || analysis.shots.length === 0) {
        throw new Error('No shots generated in analysis result')
      }

      // 🔥 截断检测：对比 shots 实际数量与 shot_count 元数据
      // 若 AI 返回的 JSON 被截断，jsonrepair 会补全括号，导致 shots 数组不完整
      // 但 shot_count 是 AI 在 JSON 开头写的，通常是准确的
      if (analysis.shot_count && analysis.shots.length < analysis.shot_count * 0.5) {
        throw new Error(
          `Truncated response detected: shot_count=${analysis.shot_count} but only ${analysis.shots.length} shots parsed. Retrying...`
        )
      }

      // 🔥 验证镜头数量：至少应该有 3 个镜头（即使是 15 秒视频）
      const expectedShotCount = SHOT_COUNT_MAP[duration] || Math.ceil(duration / UNIFIED_SEGMENT_DURATION)
      if (analysis.shots.length < Math.min(3, expectedShotCount)) {
        console.warn('[Script Analyzer Core] ⚠️  Shot count too low!', {
          expected: expectedShotCount,
          actual: analysis.shots.length,
          shotCountMeta: analysis.shot_count,
          duration,
          scriptLength: script.length
        })
      }

      // 🔥 统一分镜时长
      unifySegmentDuration(analysis)

      // 🔥 修正角色数组
      const fixedShots = fixCharacterArrays(analysis)

      if (fixedShots.length > 0) {
        console.warn('[Script Analyzer Core] ⚠️  Auto-fixed character arrays:', fixedShots)
      }

      // 🔥 自动去除重复的镜头描述
      const duplicateInfo = getDuplicateShotDescriptions(analysis)

      if (duplicateInfo.hasDuplicates) {
        console.warn('[Script Analyzer Core] ⚠️  Detected duplicate shot descriptions, auto-removing...', {
          duplicateCount: duplicateInfo.duplicateCount,
          totalShots: analysis.shots.length,
          duplicatePercentage: `${((duplicateInfo.duplicateCount / analysis.shots.length) * 100).toFixed(1)}%`,
          details: duplicateInfo.duplicateShots.map(d => ({
            shotNumbers: d.shotNumbers,
            preview: d.description.substring(0, 100)
          }))
        })

        // 自动去重
        const deduplicateResult = removeDuplicateShotDescriptions(analysis)

        // 更新 analysis 对象
        analysis.shots = deduplicateResult.uniqueShots
        analysis.shot_count = deduplicateResult.uniqueShots.length

        // 重新统一时长（文本脚本模式）
        unifySegmentDuration(analysis)

        console.log('[Script Analyzer Core] ✅ Auto-deduplicated successfully:', {
          originalShots: deduplicateResult.originalCount,
          removedShots: deduplicateResult.removedCount,
          removedShotNumbers: deduplicateResult.removedShotNumbers,
          finalShots: deduplicateResult.uniqueShots.length,
          newDuration: analysis.duration
        })
      }

      console.log('[Script Analyzer Core] Analysis completed successfully', {
        shotCount: analysis.shots.length,
        globalCharacters: analysis.characters,
        requestedDuration: duration,
        actualTotalDuration: analysis.duration,
        segmentDuration: UNIFIED_SEGMENT_DURATION,
        autoFixedShots: fixedShots.length
      })

      return analysis

    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')
      const isTruncated = error.message?.includes('Truncated response detected')

      if (isRateLimit || isTruncated) {
        const waitTime = isRateLimit ? 10 : 2

        console.warn(`[Script Analyzer Core] ${isTruncated ? 'Truncated response' : 'Rate limited'}. Retry ${retries + 1}/${maxRetries} after ${waitTime}s`, {
          retries,
          waitTime,
          error: error.message
        })

        if (retries < maxRetries) {
          retries++
          await sleep(waitTime * 1000)
          continue
        } else {
          console.error('[Script Analyzer Core] Max retries reached')
          throw new Error(
            isRateLimit
              ? `Rate limit exceeded. Please wait a moment and try again. (Retried ${maxRetries} times)`
              : `Response truncated after ${maxRetries} retries. Script may be too long.`
          )
        }
      }

      // 其他错误直接抛出
      console.error('[Script Analyzer Core] Analysis failed:', error)
      throw error
    }
  }

  // 如果所有重试都失败了
  throw new Error('Script analysis failed after multiple retries')
}

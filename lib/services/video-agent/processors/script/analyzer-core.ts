/**
 * Script Analyzer - 分析核心逻辑
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { buildScriptAnalysisPrompt } from './prompt-builder'
import { MODEL_NAME, UNIFIED_SEGMENT_DURATION, sleep } from './constants'

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * 清理 JSON 响应内容（移除可能的 markdown 标记）
 */
function cleanJsonResponse(content: string): string {
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

  return cleanContent
}

/**
 * 修正角色数组（基于全局角色列表和 description 自动匹配）
 */
function fixCharacterArrays(analysis: ScriptAnalysisResult): string[] {
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
 * 统一分镜时长（强制设置为 5 秒）
 */
function unifySegmentDuration(analysis: ScriptAnalysisResult): void {
  analysis.shots = analysis.shots.map((shot, index) => ({
    ...shot,
    duration_seconds: UNIFIED_SEGMENT_DURATION,
    time_range: `${index * UNIFIED_SEGMENT_DURATION}-${(index + 1) * UNIFIED_SEGMENT_DURATION}s`
  }))

  // 重新计算总时长
  const actualTotalDuration = analysis.shots.length * UNIFIED_SEGMENT_DURATION
  analysis.duration = actualTotalDuration
}

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
  console.log('[Script Analyzer Core] Starting analysis with Gemini 2.0 Flash', {
    scriptLength: script.length,
    duration,
    storyStyle
  })

  const prompt = buildScriptAnalysisPrompt(script, duration, storyStyle)

  // 最多重试 3 次（遇到 429 时）
  let retries = 0
  const maxRetries = 3

  while (retries <= maxRetries) {
    try {
      // 获取模型
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          temperature: 0.2,  // 降低随机性，确保结果一致
          topP: 0.9,
          maxOutputTokens: 8192,
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

      // 🔥 统一分镜时长
      unifySegmentDuration(analysis)

      // 🔥 修正角色数组
      const fixedShots = fixCharacterArrays(analysis)

      if (fixedShots.length > 0) {
        console.warn('[Script Analyzer Core] ⚠️  Auto-fixed character arrays:', fixedShots)
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
      // 检查是否是 429 限流错误
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        const waitTime = 10

        console.warn(`[Script Analyzer Core] Rate limited. Retry ${retries + 1}/${maxRetries} after ${waitTime}s`, {
          retries,
          waitTime,
          error: error.message
        })

        if (retries < maxRetries) {
          retries++
          console.log(`[Script Analyzer Core] Waiting ${waitTime}s before retry...`)
          await sleep(waitTime * 1000)
          continue // 重试
        } else {
          console.error('[Script Analyzer Core] Max retries reached')
          throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Retried ${maxRetries} times)`)
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

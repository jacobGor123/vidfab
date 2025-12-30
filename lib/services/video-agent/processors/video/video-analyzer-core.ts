/**
 * Video Analyzer - 视频分析核心逻辑
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { buildVideoAnalysisPrompt } from './video-prompt-builder'
import type { VideoSource } from './youtube-utils'
import { MODEL_NAME, UNIFIED_SEGMENT_DURATION, sleep } from '../script/constants'

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * 清理 JSON 响应内容（移除可能的 markdown 标记和额外文本）
 */
function cleanJsonResponse(content: string): string {
  let cleanContent = content.trim()

  // 🔥 策略1：先尝试移除 markdown 代码块标记
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
    // 找到了 JSON 的开始和结束位置
    cleanContent = cleanContent.substring(firstBrace, lastBrace + 1)

    console.log('[Video Analyzer Core] Extracted JSON from position', {
      firstBrace,
      lastBrace,
      extractedLength: cleanContent.length
    })
  }

  return cleanContent.trim()
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
      const charLower = charName.toLowerCase()
      // 如果 description 中提到了这个角色，加入该分镜的 characters 数组
      if (descLower.includes(charLower)) {
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
 * 从视频分析生成脚本（使用 Google Generative AI）
 * @param videoSource 视频来源（YouTube URL 或本地视频 URL）
 * @param duration 目标视频时长 (15/30/45/60)
 * @param storyStyle 剧情风格
 * @returns 结构化分镜数据（与文本脚本分析相同格式）
 */
export async function analyzeVideoToScript(
  videoSource: VideoSource,
  duration: number,
  storyStyle: string
): Promise<ScriptAnalysisResult> {
  console.log('[Video Analyzer Core] Starting video analysis with Gemini 2.0 Flash', {
    videoType: videoSource.type,
    videoUrl: videoSource.url.substring(0, 100) + '...',
    duration,
    storyStyle
  })

  const prompt = buildVideoAnalysisPrompt(duration, storyStyle)

  // 最多重试 3 次（遇到 429 时）
  let retries = 0
  const maxRetries = 3

  while (retries <= maxRetries) {
    try {
      // 获取模型
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 8192,
        }
      })

      console.log('[Video Analyzer Core] Sending request to Gemini with YouTube URL:', {
        videoUrl: videoSource.url,
        promptLength: prompt.length
      })

      // 🔥 关键：Google 官方 SDK 支持直接传 YouTube URL
      const result = await model.generateContent([
        prompt,
        {
          fileData: {
            mimeType: 'video/*',
            fileUri: videoSource.url  // 直接使用 YouTube URL
          }
        }
      ])

      const response = await result.response
      const content = response.text()

      if (!content) {
        throw new Error('Empty response from Gemini')
      }

      console.log('[Video Analyzer Core] Received response from Gemini:', {
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
        console.error('[Video Analyzer Core] JSON parse error:', parseError)
        console.error('[Video Analyzer Core] Raw content:', content)
        console.error('[Video Analyzer Core] Cleaned content:', cleanContent)
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
        console.warn('[Video Analyzer Core] ⚠️  Auto-fixed character arrays:', fixedShots)
      }

      console.log('[Video Analyzer Core] Video analysis completed successfully', {
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

        console.warn(`[Video Analyzer Core] Rate limited. Retry ${retries + 1}/${maxRetries} after ${waitTime}s`, {
          retries,
          waitTime,
          error: error.message
        })

        if (retries < maxRetries) {
          retries++
          console.log(`[Video Analyzer Core] Waiting ${waitTime}s before retry...`)
          await sleep(waitTime * 1000)
          continue // 重试
        } else {
          console.error('[Video Analyzer Core] Max retries reached')
          throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Retried ${maxRetries} times)`)
        }
      }

      // 其他错误直接抛出
      console.error('[Video Analyzer Core] Video analysis failed:', error)
      throw error
    }
  }

  // 如果所有重试都失败了
  throw new Error('Video analysis failed after multiple retries')
}

/**
 * Video Analyzer - 视频分析核心逻辑
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { buildVideoAnalysisPrompt } from './video-prompt-builder'
import type { VideoSource } from './youtube-utils'
import { MODEL_NAME, sleep } from '../script/constants'
import {
  cleanJsonResponse,
  getDuplicateShotDescriptions,
  removeDuplicateShotDescriptions,
  fixCharacterArrays
} from '../analysis-utils'

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

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
          temperature: 0.2,  // 适中的创造性，避免重复
          topP: 0.9,
          maxOutputTokens: 8192,
        }
      })

      console.log('[Video Analyzer Core] Sending request to Gemini with video:', {
        videoUrl: videoSource.url,
        videoType: videoSource.type,
        promptLength: prompt.length
      })

      const videoMimeType = 'mimeType' in videoSource ? (videoSource.mimeType || 'video/mp4') : 'video/mp4'

      // 🔥 根据 Google Gemini API 文档，YouTube 视频可以直接使用 fileUri
      // 参考：https://ai.google.dev/gemini-api/docs/video-understanding
      // 关键：mimeType 必须是 "video/mp4"（不能用 "video/*"）
      // YouTube URL 必须是标准格式：https://www.youtube.com/watch?v=VIDEO_ID
      const parts: any[] = [
        { text: prompt },
        {
          fileData: {
            mimeType: videoMimeType,  // 🔥 YouTube 和大多数上传视频使用 video/mp4
            fileUri: videoSource.url
          }
        }
      ]

      console.log('[Video Analyzer Core] Gemini request structure:', {
        partsCount: parts.length,
        videoType: videoSource.type,
        mimeType: videoMimeType,
        fileUri: videoSource.url,
        promptLength: prompt.length
      })

      // 使用简单的 generateContent 调用
      const result = await model.generateContent(parts)

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

      console.log('[Video Analyzer Core] After cleaning:', {
        originalLength: content.length,
        cleanedLength: cleanContent.length,
        cleanedPreview: cleanContent.substring(0, 300)
      })

      // 解析 JSON
      let analysis: ScriptAnalysisResult
      try {
        analysis = JSON.parse(cleanContent)
      } catch (parseError) {
        // 🔥 使用 console.log 而不是 console.error，确保一定能看到
        console.log('[Video Analyzer Core] ❌❌❌ JSON PARSE FAILED ❌❌❌')
        console.log('[Video Analyzer Core] Parse error:', parseError)
        console.log('[Video Analyzer Core] Raw content (first 500 chars):', content.substring(0, 500))
        console.log('[Video Analyzer Core] Raw content (last 500 chars):', content.substring(Math.max(0, content.length - 500)))
        console.log('[Video Analyzer Core] Cleaned content (first 500 chars):', cleanContent.substring(0, 500))
        console.log('[Video Analyzer Core] Cleaned content (last 500 chars):', cleanContent.substring(Math.max(0, cleanContent.length - 500)))
        console.log('[Video Analyzer Core] Full cleaned content:', cleanContent)

        throw new Error(`Invalid JSON response from Gemini: ${(parseError as Error).message}`)
      }

      // 验证结果
      if (!analysis.shots || analysis.shots.length === 0) {
        throw new Error('No shots generated in analysis result')
      }

      // 🔥 数据规范化：确保所有 duration_seconds 都是整数，且 >= 2 秒（BytePlus 最小值）
      // 这很重要，因为数据库 schema 中 duration_seconds 字段是 integer 类型
      // 同时，Gemini 可能返回过小的时长（如 0.5秒），需要强制最小值
      analysis.shots = analysis.shots.map(shot => ({
        ...shot,
        duration_seconds: Math.max(2, Math.round(shot.duration_seconds))  // 🔥 最小2秒
      }))

      // 🔥 强制设置 duration 字段，确保永远不会是 undefined
      // 优先级：Gemini 返回的 duration > 所有 shot 时长总和 > 传入的 duration 参数
      if (analysis.duration) {
        analysis.duration = Math.round(analysis.duration)
      } else {
        // 如果 Gemini 没有返回 duration，使用所有 shot 的时长总和
        const totalDuration = analysis.shots.reduce((sum, shot) => sum + (shot.duration_seconds || 5), 0)
        analysis.duration = Math.max(1, Math.min(120, Math.round(totalDuration || duration)))
      }

      // 🔥 移除强制统一时长逻辑（YouTube 视频复刻模式应保持原视频的真实时长）
      // unifySegmentDuration(analysis)  // ❌ 已禁用：严格复刻模式不应修改时长

      // 🔥 过滤无意义的分镜（全黑、全白、纯色等）
      const originalShotCount = analysis.shots.length
      analysis.shots = analysis.shots.filter(shot => {
        const desc = shot.description.toLowerCase()

        // 检测无意义的分镜描述
        const meaninglessKeywords = [
          'black screen',
          'white screen',
          'solid black',
          'solid white',
          'pure black',
          'pure white',
          'fade to black',
          'fade to white',
          'blank screen',
          'empty screen',
          'loading screen',
          'transition effect',
          'logo screen',
          'title card',
          'color bar',
          'test pattern'
        ]

        const isMeaningless = meaninglessKeywords.some(keyword => desc.includes(keyword))

        if (isMeaningless) {
          console.warn('[Video Analyzer Core] ⚠️  Filtered out meaningless shot:', {
            shotNumber: shot.shot_number,
            description: shot.description.substring(0, 100)
          })
        }

        return !isMeaningless
      })

      // 重新编号分镜并更新总数
      if (analysis.shots.length < originalShotCount) {
        analysis.shots = analysis.shots.map((shot, index) => ({
          ...shot,
          shot_number: index + 1,
          time_range: shot.time_range // 保持原时间范围
        }))

        analysis.shot_count = analysis.shots.length

        console.log('[Video Analyzer Core] ✅ Filtered meaningless shots:', {
          originalCount: originalShotCount,
          filteredCount: originalShotCount - analysis.shots.length,
          finalCount: analysis.shots.length
        })
      }

      // 🔥 修正角色数组
      const fixedShots = fixCharacterArrays(analysis)

      if (fixedShots.length > 0) {
        console.warn('[Video Analyzer Core] ⚠️  Auto-fixed character arrays:', fixedShots)
      }

      // 🔥 自动去除重复的镜头描述
      const duplicateInfo = getDuplicateShotDescriptions(analysis)

      if (duplicateInfo.hasDuplicates) {
        console.warn('[Video Analyzer Core] ⚠️  Detected duplicate shot descriptions, auto-removing...', {
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

        // 重新计算总时长（确保在 1-120 秒范围内）
        const newTotalDuration = deduplicateResult.uniqueShots.reduce((sum, shot) => sum + (shot.duration_seconds || 5), 0)
        analysis.duration = Math.max(1, Math.min(120, Math.round(newTotalDuration)))

        console.log('[Video Analyzer Core] ✅ Auto-deduplicated successfully:', {
          originalShots: deduplicateResult.originalCount,
          removedShots: deduplicateResult.removedCount,
          removedShotNumbers: deduplicateResult.removedShotNumbers,
          finalShots: deduplicateResult.uniqueShots.length,
          newDuration: analysis.duration
        })
      }

      console.log('[Video Analyzer Core] Video analysis completed successfully', {
        shotCount: analysis.shots.length,
        globalCharacters: analysis.characters,
        requestedDuration: duration,
        actualTotalDuration: analysis.duration,
        autoFixedShots: fixedShots.length
      })

      return analysis

    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')

      // 检查是否是 429 限流错误
      if (isRateLimit) {
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

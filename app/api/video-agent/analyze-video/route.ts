/**
 * API Route: 视频分析
 * POST /api/video-agent/analyze-video
 *
 * 功能：
 * - 接收 YouTube URL、TikTok URL 或本地视频 URL
 * - 调用 Gemini 2.5 Flash 分析视频内容
 * - 返回结构化脚本（与文本脚本分析相同格式）
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { analyzeVideoToScript, isValidYouTubeUrl, isValidTikTokUrl, getYouTubeDuration, convertToStandardYouTubeUrl } from '@/lib/services/video-agent/video-analyzer-google'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { checkAndDeductScriptCreation } from '@/lib/video-agent/script-creation-quota'
import { prepareTikTokVideo, type TikTokSourceMetadata } from '@/lib/services/video-agent/processors/video/tiktok-source'
import { deleteGeminiFile, uploadVideoFileToGemini } from '@/lib/services/video-agent/processors/video/gemini-file-uploader'
import type { VideoSource } from '@/lib/services/video-agent/processors/video/youtube-utils'

export const maxDuration = 300 // 最长 5 分钟（视频分析可能较慢）

/**
 * POST /api/video-agent/analyze-video
 *
 * Request Body:
 * {
 *   "videoSource": {
 *     "type": "youtube" | "tiktok" | "local",
 *     "url": "https://www.youtube.com/watch?v=xxxxx" | "https://www.tiktok.com/@user/video/xxxxx" | "https://your-storage.com/video.mp4"
 *   },
 *   "duration": 15 | 30 | 45 | 60,
 *   "storyStyle": "auto" | "comedy" | "mystery" | ...,
 *   "aspectRatio": "16:9" | "9:16"  // 可选
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": ScriptAnalysisResult
 * }
 */
export const POST = withAuth(async (req, { params, userId }) => {
  try {
    // 1. 解析请求体
    const body = await req.json()
    const { videoSource, duration, storyStyle, aspectRatio = '16:9', imageStyle, muteBgm = false } = body

    console.log('[API /analyze-video] Received request:', {
      userId,
      videoType: videoSource?.type,
      duration,
      storyStyle
    })

    // 3. 验证参数
    if (!videoSource || !videoSource.type || !videoSource.url) {
      return NextResponse.json(
        { success: false, error: 'Missing videoSource parameter' },
        { status: 400 }
      )
    }

    if (!['youtube', 'tiktok', 'local'].includes(videoSource.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video source type. Must be "youtube", "tiktok", or "local"' },
        { status: 400 }
      )
    }

    // 🔥 对于 YouTube 视频，duration 参数仅作为备用（如果获取真实时长失败）
    // 对于本地视频，仍然需要验证 duration
    if (videoSource.type === 'local' && ![15, 30, 45, 60].includes(duration)) {
      return NextResponse.json(
        { success: false, error: 'Duration must be 15, 30, 45, or 60 seconds for local videos' },
        { status: 400 }
      )
    }

    const validStyles = ['auto', 'comedy', 'mystery', 'moral', 'twist', 'suspense', 'warmth', 'inspiration']
    if (!validStyles.includes(storyStyle)) {
      return NextResponse.json(
        { success: false, error: `Invalid story style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. 验证 YouTube URL 格式（如果是 YouTube 视频）
    if (videoSource.type === 'youtube' && !isValidYouTubeUrl(videoSource.url)) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL format' },
        { status: 400 }
      )
    }

    // 4b. 验证 TikTok URL 格式（如果是 TikTok 视频）
    if (videoSource.type === 'tiktok' && !isValidTikTokUrl(videoSource.url)) {
      return NextResponse.json(
        { success: false, error: 'Invalid TikTok URL format' },
        { status: 400 }
      )
    }

    // ✅ 脚本创建配额检查（新增）
    // 检查月度免费次数配额，超额时扣除3积分
    const quotaCheck = await checkAndDeductScriptCreation(userId)

    if (!quotaCheck.canAfford) {
      console.log('[API /analyze-video] Script creation quota check failed:', quotaCheck)
      return NextResponse.json(
        {
          error: quotaCheck.error || 'Script creation quota exceeded',
          code: 'INSUFFICIENT_CREDITS',
          details: quotaCheck.details
        },
        { status: 402 }
      )
    }

    console.log('[API /analyze-video] Script creation quota check passed:', {
      withinQuota: quotaCheck.withinQuota,
      currentUsage: quotaCheck.currentUsage,
      monthlyQuota: quotaCheck.monthlyQuota,
      creditsDeducted: quotaCheck.creditsDeducted
    })

    // ✅ 积分检查 (YouTube 分析入口 - 只检查余额，不扣除)
    // 实际扣除在人物图生成时进行
    const { data: user } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userId)
      .single()

    const userCredits = user?.credits_remaining || 0

    if (userCredits < 10) {
      return NextResponse.json(
        {
          error: `Insufficient credits. You need at least 10 credits to start, but only have ${userCredits}.`,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: 10,
          userCredits
        },
        { status: 402 }
      )
    }

    const originalVideoSource = { ...videoSource } as VideoSource
    let analysisVideoSource = videoSource as VideoSource
    let sourceMetadata: TikTokSourceMetadata | undefined
    let cleanupPreparedVideo: (() => Promise<void>) | null = null
    let uploadedGeminiFileName: string | undefined

    // 5. 🔥 获取 YouTube/TikTok 视频真实时长
    let actualDuration = duration // 默认使用用户选择的时长

    if (videoSource.type === 'youtube') {
      try {
        console.log('[API /analyze-video] Fetching YouTube video duration...')
        actualDuration = await getYouTubeDuration(videoSource.url)
        console.log('[API /analyze-video] YouTube video actual duration:', actualDuration, 'seconds')

        // 将实际时长四舍五入到最接近的整数
        actualDuration = Math.round(actualDuration)

        // 🔥 检查时长限制：YouTube 视频最大支持 60 秒（1 分钟）
        if (actualDuration > 60) {
          return NextResponse.json(
            {
              success: false,
              error: `Video is too long (${actualDuration}s). Maximum supported duration is 60 seconds (1 minute). Please use a shorter video.`,
              code: 'VIDEO_TOO_LONG',
              actualDuration
            },
            { status: 400 }
          )
        }

      } catch (error: any) {
        console.error('[API /analyze-video] Failed to get YouTube video duration:', error.message)
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to verify video duration. Please check the video URL and try again.',
            code: 'DURATION_CHECK_FAILED'
          },
          { status: 400 }
        )
      }
    }

    if (videoSource.type === 'tiktok') {
      try {
        console.log('[API /analyze-video] Preparing TikTok video for Gemini analysis...')
        const preparedTikTok = await prepareTikTokVideo(videoSource.url)
        cleanupPreparedVideo = preparedTikTok.cleanup
        sourceMetadata = preparedTikTok.metadata

        if (preparedTikTok.duration) {
          actualDuration = Math.round(preparedTikTok.duration)
        }

        if (actualDuration > 60) {
          if (cleanupPreparedVideo) {
            await cleanupPreparedVideo()
            cleanupPreparedVideo = null
          }
          return NextResponse.json(
            {
              success: false,
              error: `Video is too long (${actualDuration}s). Maximum supported duration is 60 seconds (1 minute). Please use a shorter video.`,
              code: 'VIDEO_TOO_LONG',
              actualDuration
            },
            { status: 400 }
          )
        }

        const uploaded = await uploadVideoFileToGemini(preparedTikTok.filePath, preparedTikTok.mimeType)
        uploadedGeminiFileName = uploaded.name
        analysisVideoSource = {
          type: 'local',
          url: uploaded.uri,
          mimeType: uploaded.mimeType
        }

        console.log('[API /analyze-video] TikTok video uploaded to Gemini:', {
          actualDuration,
          mimeType: uploaded.mimeType,
          canonicalUrl: sourceMetadata?.canonical_url,
          postId: sourceMetadata?.post_id
        })
      } catch (error: any) {
        console.error('[API /analyze-video] Failed to prepare TikTok video:', error)
        if (uploadedGeminiFileName) {
          await deleteGeminiFile(uploadedGeminiFileName)
        }
        if (cleanupPreparedVideo) {
          await cleanupPreparedVideo()
        }
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Unable to prepare TikTok video. Please check the URL and try again.',
            code: 'TIKTOK_PREPARE_FAILED'
          },
          { status: 400 }
        )
      }
    }

    // 6. 🔥 转换 YouTube URL 为标准 watch 格式
    // Gemini API 可能只支持标准的 watch?v= 格式，不支持 Shorts
    if (videoSource.type === 'youtube') {
      const standardUrl = convertToStandardYouTubeUrl(videoSource.url)
      console.log('[API /analyze-video] Converted YouTube URL to standard format:', {
        original: videoSource.url,
        standard: standardUrl,
        isShorts: videoSource.url.includes('/shorts/'),
        videoId: standardUrl.split('v=')[1]
      })
      analysisVideoSource = {
        type: 'youtube',
        url: standardUrl
      }
    }

    // 7. 调用视频分析服务（使用实际时长）
    console.log('[API /analyze-video] Calling video analyzer...', {
      userSelectedDuration: duration,
      actualDuration,
      sourceType: originalVideoSource.type
    })

    const startTime = Date.now()

    let analysis
    try {
      analysis = await analyzeVideoToScript(
        analysisVideoSource,
        actualDuration,  // 🔥 使用实际时长，而不是用户选择的时长
        storyStyle
      )
    } finally {
      if (uploadedGeminiFileName) {
        await deleteGeminiFile(uploadedGeminiFileName)
      }
      if (cleanupPreparedVideo) {
        await cleanupPreparedVideo()
      }
    }

    if (originalVideoSource.type === 'tiktok' && analysis.duration > 60) {
      return NextResponse.json(
        {
          success: false,
          error: `Video is too long (${analysis.duration}s). Maximum supported duration is 60 seconds (1 minute). Please use a shorter video.`,
          code: 'VIDEO_TOO_LONG',
          actualDuration: analysis.duration
        },
        { status: 400 }
      )
    }

    actualDuration = Math.round(analysis.duration || actualDuration)

    analysis.source_metadata = sourceMetadata || {
      platform: originalVideoSource.type,
      original_url: originalVideoSource.url,
      canonical_url: analysisVideoSource.url
    }

    const analysisTime = Date.now() - startTime

    console.log('[API /analyze-video] Video analysis completed', {
      userId,
      videoType: originalVideoSource.type,
      actualDuration,
      shotCount: analysis.shots.length,
      characters: analysis.characters,
      analysisTimeMs: analysisTime
    })

    // 7. 🔥 创建项目（避免前端再次调用 createProject 导致重复扣配额）
    // 从分析结果生成脚本文本
    const scriptParts = analysis.shots.map((shot: any, index: number) => {
      const shotNumber = index + 1
      const description = shot.description || ''
      const action = shot.character_action || ''
      return `Shot ${shotNumber}: ${description}. ${action}`
    })
    const scriptContent = scriptParts.join('\n\n')

    // 创建项目记录
    const projectInsert = {
      user_id: userId,
      duration: actualDuration,
      story_style: storyStyle,
      original_script: scriptContent,
      aspect_ratio: aspectRatio,
      mute_bgm: muteBgm,
      image_style_id: imageStyle || null,  // 🔥 直接设置图片风格
      status: 'draft',
      current_step: 1,
      script_analysis: analysis  // 保存分析结果
    } as any

    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .insert(projectInsert)
      .select()
      .single()

    if (projectError || !project) {
      console.error('[API /analyze-video] Failed to create project:', projectError)
      return NextResponse.json(
        { success: false, error: 'Video analyzed but failed to create project' },
        { status: 500 }
      )
    }

    console.log('[API /analyze-video] Project created:', {
      projectId: project.id,
      duration: project.duration,
      shotCount: analysis.shots.length
    })

    // 8. 返回结果（包含项目 ID）
    // 🔥 将 project 和 analysis 都放在 data 里，避免 callAPI 自动提取时丢失 project
    return NextResponse.json({
      success: true,
      data: {
        analysis: analysis,
        project: project,
        meta: {
          analysisTimeMs: analysisTime,
          videoSource: originalVideoSource.type,
          actualDuration,
          userSelectedDuration: duration
        }
      }
    })

  } catch (error: any) {
    console.error('[API /analyze-video] Error:', error)

    // 返回友好的错误信息
    let errorMessage = 'Video analysis failed'
    let statusCode = 500

    if (error.message?.includes('Rate limit')) {
      errorMessage = 'API rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (error.message?.includes('Invalid JSON')) {
      errorMessage = 'Failed to parse video content. Please try a different video.'
      statusCode = 422
    } else if (error.message?.includes('Empty response')) {
      errorMessage = 'No response from video analysis service. Please try again.'
      statusCode = 503
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    )
  }
})

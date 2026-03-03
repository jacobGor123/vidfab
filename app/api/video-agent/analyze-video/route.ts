/**
 * API Route: 视频分析
 * POST /api/video-agent/analyze-video
 *
 * 功能：
 * - 接收 YouTube URL 或本地视频 URL
 * - 调用 Gemini 2.5 Flash 分析视频内容
 * - 返回结构化脚本（与文本脚本分析相同格式）
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { analyzeVideoToScript, isValidYouTubeUrl, getYouTubeDuration, convertToStandardYouTubeUrl } from '@/lib/services/video-agent/video-analyzer-google'
import { deductUserCredits } from '@/lib/simple-credits-check'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { checkAndDeductScriptCreation } from '@/lib/video-agent/script-creation-quota'

export const maxDuration = 300 // 最长 5 分钟（视频分析可能较慢）

/**
 * POST /api/video-agent/analyze-video
 *
 * Request Body:
 * {
 *   "videoSource": {
 *     "type": "youtube" | "local",
 *     "url": "https://www.youtube.com/watch?v=xxxxx" | "https://your-storage.com/video.mp4"
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

    if (!['youtube', 'local'].includes(videoSource.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video source type. Must be "youtube" or "local"' },
        { status: 400 }
      )
    }

    // 🔥 对于 YouTube 视频，duration 参数仅作为备用（如果获取真实时长失败）
    // 对于本地视频，仍然需要验证 duration
    if (videoSource.type !== 'youtube' && ![15, 30, 45, 60].includes(duration)) {
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

    // 5. 🔥 获取 YouTube 视频真实时长（如果是 YouTube 视频）
    let actualDuration = duration // 默认使用用户选择的时长

    if (videoSource.type === 'youtube') {
      try {
        console.log('[API /analyze-video] Fetching YouTube video duration...')
        actualDuration = await getYouTubeDuration(videoSource.url)
        console.log('[API /analyze-video] YouTube video actual duration:', actualDuration, 'seconds')

        // 将实际时长四舍五入到最接近的整数
        actualDuration = Math.round(actualDuration)

        // 🔥 检查时长限制：YouTube 视频最大支持 120 秒（2 分钟）
        if (actualDuration > 120) {
          return NextResponse.json(
            {
              success: false,
              error: `Video is too long (${actualDuration}s). Maximum supported duration is 120 seconds (2 minutes). Please use a shorter video.`,
              code: 'VIDEO_TOO_LONG',
              actualDuration
            },
            { status: 400 }
          )
        }

      } catch (error: any) {
        console.warn('[API /analyze-video] Failed to get YouTube duration, using user selection:', error.message)
        // 如果获取失败，继续使用用户选择的时长
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
      videoSource.url = standardUrl
    }

    // 7. 调用视频分析服务（使用实际时长）
    console.log('[API /analyze-video] Calling video analyzer...', {
      userSelectedDuration: duration,
      actualDuration,
      isYouTube: videoSource.type === 'youtube'
    })

    const startTime = Date.now()

    const analysis = await analyzeVideoToScript(
      videoSource,
      actualDuration,  // 🔥 使用实际时长，而不是用户选择的时长
      storyStyle
    )

    const analysisTime = Date.now() - startTime

    console.log('[API /analyze-video] Video analysis completed', {
      userId,
      videoType: videoSource.type,
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
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .insert({
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
      })
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
          videoSource: videoSource.type,
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

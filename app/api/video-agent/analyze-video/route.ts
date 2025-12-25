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
import { analyzeVideoToScript, isValidYouTubeUrl } from '@/lib/services/video-agent/video-analyzer-google'

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
    const { videoSource, duration, storyStyle, aspectRatio = '16:9' } = body

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

    if (![15, 30, 45, 60].includes(duration)) {
      return NextResponse.json(
        { success: false, error: 'Duration must be 15, 30, 45, or 60 seconds' },
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

    // 5. 调用视频分析服务
    console.log('[API /analyze-video] Calling video analyzer...')

    const startTime = Date.now()

    const analysis = await analyzeVideoToScript(
      videoSource,
      duration,
      storyStyle
    )

    const analysisTime = Date.now() - startTime

    console.log('[API /analyze-video] Video analysis completed', {
      userId,
      videoType: videoSource.type,
      shotCount: analysis.shots.length,
      characters: analysis.characters,
      analysisTimeMs: analysisTime
    })

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: analysis,
      meta: {
        analysisTimeMs: analysisTime,
        videoSource: videoSource.type
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

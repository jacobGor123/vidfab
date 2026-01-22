/**
 * Video Agent - 角色图片分析 API
 * POST: 分析角色图片，返回视觉描述
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { analyzeCharacterImage } from '@/lib/services/video-agent/character-image-analyzer'

/**
 * 分析角色图片
 * POST /api/video-agent/analyze-character-image
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json()
    const { imageUrl, characterName } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required', code: 'IMAGE_URL_MISSING' },
        { status: 400 }
      )
    }

    console.log('[Analyze Character Image API] Starting analysis:', {
      imageUrl,
      characterName
    })

    // 调用分析服务
    const analysis = await analyzeCharacterImage(imageUrl, characterName)

    console.log('[Analyze Character Image API] Analysis completed')

    return NextResponse.json({
      success: true,
      data: analysis
    })

  } catch (error) {
    console.error('[Analyze Character Image API] Analysis failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze character image',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})

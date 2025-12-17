/**
 * Video Agent - AI 生成人物参考图 API
 * 支持文生图和图生图
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'

/**
 * 生成人物参考图
 * POST /api/video-agent/generate-character-image
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 解析请求体
    let body: {
      prompt: string
      aspectRatio?: string
      images?: string[]
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { prompt, aspectRatio = '16:9', images } = body

    // 验证 prompt
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Generating character image', {
      promptLength: prompt.length,
      aspectRatio,
      hasSourceImages: !!images && images.length > 0,
      sourceImageCount: images?.length || 0
    })

    // 调用 SeedreamImage API
    try {
      const result = await submitImageGeneration({
        prompt,
        aspectRatio,
        images: images && images.length > 0 ? images : undefined,
        watermark: false
      })

      if (!result.imageUrl) {
        throw new Error('No image URL returned from API')
      }

      console.log('[Video Agent] Character image generated successfully')

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl
      })
    } catch (apiError) {
      console.error('[Video Agent] Image generation failed:', apiError)
      return NextResponse.json(
        {
          error: 'Failed to generate image',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Video Agent] Generate character image error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined
      },
      { status: 500 }
    )
  }
}

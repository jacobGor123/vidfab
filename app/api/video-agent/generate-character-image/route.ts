/**
 * Video Agent - AI 生成人物参考图 API
 * 支持文生图和图生图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'

/**
 * 生成人物参考图
 * POST /api/video-agent/generate-character-image
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    // 验证用户身份
        // 解析请求体
    let body: {
      prompt: string
      negativePrompt?: string
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

    const { prompt, negativePrompt, aspectRatio = '16:9', images } = body

    // 验证 prompt
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Generating character image', {
      prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),  // 前500字符
      promptLength: prompt.length,
      negativePrompt: negativePrompt?.substring(0, 300) + (negativePrompt && negativePrompt.length > 300 ? '...' : ''),  // 前300字符
      hasNegativePrompt: !!negativePrompt,
      negativePromptLength: negativePrompt?.length || 0,
      aspectRatio,
      hasSourceImages: !!images && images.length > 0,
      sourceImageCount: images?.length || 0
    })

    // 调用 SeedreamImage API
    try {
      const result = await submitImageGeneration({
        prompt,
        negativePrompt,
        model: 'seedream-v4',
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
        data: {
          imageUrl: result.imageUrl
        }
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
})

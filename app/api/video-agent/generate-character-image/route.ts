/**
 * Video Agent - AI 生成人物参考图 API
 * 支持文生图和图生图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'
import { enforceCharacterPromptStyle } from '@/lib/services/video-agent/character-prompt-generator'

/**
 * 生成人物参考图
 * POST /api/video-agent/generate-character-image
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    // 解析请求体
    let body: {
      prompt: string
      negativePrompt?: string
      aspectRatio?: string
      images?: string[]
      imageStyle?: string  // 🔥 新增：支持传递 imageStyle
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { prompt, negativePrompt, aspectRatio = '16:9', images, imageStyle = 'realistic' } = body

    // 验证 prompt
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // 🔥 风格包装：只追加统一风格，不重写角色外观。
    let finalPrompt = prompt
    let finalNegativePrompt = negativePrompt || ''

    // 只统一风格包装；角色核心描述由用户/脚本分析结果锁定，不做审美词删除或外观改写。
    const processed = enforceCharacterPromptStyle(finalPrompt, finalNegativePrompt, imageStyle)
    finalPrompt = processed.prompt
    finalNegativePrompt = processed.negativePrompt
    console.log('[Video Agent] ✅ Enforced style consistency:', { imageStyle })

    console.log('[Video Agent] Generating character image', {
      prompt: finalPrompt.substring(0, 500) + (finalPrompt.length > 500 ? '...' : ''),  // 前500字符
      promptLength: finalPrompt.length,
      negativePrompt: finalNegativePrompt?.substring(0, 300) + (finalNegativePrompt && finalNegativePrompt.length > 300 ? '...' : ''),  // 前300字符
      hasNegativePrompt: !!finalNegativePrompt,
      negativePromptLength: finalNegativePrompt?.length || 0,
      aspectRatio,
      hasSourceImages: !!images && images.length > 0,
      sourceImageCount: images?.length || 0
    })

    // 调用 SeedreamImage API
    try {
      const result = await submitImageGeneration({
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
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

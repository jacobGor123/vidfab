/**
 * Video Agent - AI 生成人物参考图 API
 * 支持文生图和图生图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'
import { IMAGE_STYLES, type ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

/**
 * 🔥 强制后处理（方案 A）：统一风格处理
 * 与 character-prompt-generator.ts 中的逻辑保持一致
 */
function enforceStyleConsistency(
  prompt: string,
  negativePrompt: string,
  imageStyle: string
): {
  prompt: string
  negativePrompt: string
} {
  const styleConfig = IMAGE_STYLES[imageStyle as ImageStyle]
  if (!styleConfig) {
    console.warn(`[Enforce Style] Unknown style: ${imageStyle}, using as-is`)
    return { prompt, negativePrompt }
  }

  let cleanedPrompt = prompt

  console.log('[Enforce Style] Original:', {
    imageStyle,
    originalPrompt: prompt.substring(0, 150)
  })

  // 🔥 步骤 1: 清理所有审美评价词
  const aestheticWords = [
    'adorable', 'cute', 'kawaii', 'charming', 'lovely', 'sweet',
    'beautiful', 'stunning', 'gorgeous', 'elegant', 'graceful',
    'majestic', 'magnificent', 'impressive', 'striking'
  ]
  aestheticWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    cleanedPrompt = cleanedPrompt.replace(regex, '').trim()
  })

  // 🔥 步骤 2: 清理所有风格关键词
  const allStyleKeywords = [
    'photorealistic', 'realistic photograph', 'professional photography',
    'natural lighting', 'dslr', 'film grain', 'Fujifilm', 'RAW photo',
    'real photo', 'documentary photography', 'wildlife photography',
    'national geographic', 'hyper-realistic',
    '3d render', '3d rendered', 'octane render', 'unreal engine',
    'cgi', 'ray tracing', 'Pixar style',
    'anime', 'anime style', 'manga', 'cel shaded', 'japanese animation',
    'oil painting', 'watercolor', 'painted', 'painting style',
    'illustration', 'illustrated', 'drawing', 'sketch',
    'cartoon', 'comic', 'fantasy art', 'concept art'
  ]

  allStyleKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    cleanedPrompt = cleanedPrompt.replace(regex, '').trim()
  })

  // 清理多余的逗号、空格和连续标点
  cleanedPrompt = cleanedPrompt
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/,\s*\./g, '.')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .trim()

  // 🔥 步骤 3: 强制添加风格前缀 + 核心描述 + 风格后缀
  const finalPrompt = `${styleConfig.promptPrefix} ${cleanedPrompt}, ${styleConfig.promptSuffix}`.trim()

  // 🔥 步骤 4: 强制添加风格特定的负面 prompt
  let finalNegativePrompt = negativePrompt

  if (styleConfig.negativePromptExtra) {
    const extraNegatives = styleConfig.negativePromptExtra.split(',').map(s => s.trim())
    const missingExtraNegatives = extraNegatives.filter(neg =>
      !finalNegativePrompt.toLowerCase().includes(neg.toLowerCase())
    )

    if (missingExtraNegatives.length > 0) {
      finalNegativePrompt += ', ' + missingExtraNegatives.join(', ')
    }
  }

  console.log('[Enforce Style] ✅ Processed:', {
    imageStyle,
    cleanedPrompt: cleanedPrompt.substring(0, 100),
    finalPromptPreview: finalPrompt.substring(0, 150)
  })

  return { prompt: finalPrompt, negativePrompt: finalNegativePrompt }
}

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

    // 🔥 强制后处理：清理冲突关键词并强制执行风格规则（针对所有风格）
    let finalPrompt = prompt
    let finalNegativePrompt = negativePrompt || ''

    // 对所有风格都执行后处理，清理冲突关键词
    const processed = enforceStyleConsistency(finalPrompt, finalNegativePrompt, imageStyle)
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

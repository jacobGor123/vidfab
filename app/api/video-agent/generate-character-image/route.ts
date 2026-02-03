/**
 * Video Agent - AI 生成人物参考图 API
 * 支持文生图和图生图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'

/**
 * 🔥 强制后处理：确保 realistic 风格的规则被严格执行
 */
function enforceRealisticStyle(prompt: string, negativePrompt: string): {
  prompt: string
  negativePrompt: string
} {
  const isSmall = /\b(small|tiny|little|baby|cub|juvenile|toddler)\b/i.test(prompt)
  const isAnimal = /\b(cat|cats|dog|dogs|puppy|puppies|kitten|kittens|lamb|lambs|sheep|rabbit|rabbits|bunny|bunnies|bird|birds|fox|foxes|tiger|tigers|lion|lions|bear|bears|wolf|wolves|deer|mouse|mice|hamster|hamsters|squirrel|squirrels|raccoon|raccoons|hedgehog|hedgehogs|otter|otters|seal|seals|penguin|penguins|owl|owls|eagle|eagles|hawk|hawks|parrot|parrots|duck|ducks|chicken|chickens|pig|pigs|cow|cows|calf|calves|horse|horses|foal|foals|goat|goats|donkey|donkeys|zebra|zebras|giraffe|giraffes|elephant|elephants|rhino|rhinos|hippo|hippos|monkey|monkeys|ape|apes|gorilla|gorillas|panda|pandas|koala|koalas|kangaroo|kangaroos|dolphin|dolphins|whale|whales|shark|sharks|fish|fishes|turtle|turtles|frog|frogs|lizard|lizards|snake|snakes|crocodile|crocodiles|alligator|alligators|dragon|dragons|chihuahua|chihuahuas|poodle|poodles|bulldog|bulldogs|beagle|beagles|husky|huskies|labrador|labradors|retriever|retrievers|terrier|terriers|pug|pugs|corgi|corgis|dachshund|dachshunds|spaniel|spaniels|shepherd|shepherds)\b/i.test(prompt)
  const isAnthropomorphic = isAnimal && /\b(wearing|dressed|clothes|shirt|sweater|jacket|coat|hat|scarf|pants|shoes|boots|glasses|necklace|bracelet|ring)\b/i.test(prompt)

  let processedPrompt = prompt
  let processedNegativePrompt = negativePrompt

  // 🔥 规则: 所有动物（realistic 风格下） → 强制写实
  // 不管是大是小、是否拟人化，所有动物都应该是真实照片
  if (isAnimal) {
    if (!/^realistic photograph of/i.test(processedPrompt)) {
      processedPrompt = 'realistic photograph of ' + processedPrompt
    }

    const requiredSuffixes = ['real photo', 'not illustration', 'not cartoon', 'not 3d render', 'not animated', 'not drawn', 'photorealistic']
    const missingSuffixes = requiredSuffixes.filter(suffix => !processedPrompt.toLowerCase().includes(suffix.toLowerCase()))

    if (missingSuffixes.length > 0) {
      const additionalSuffixes = missingSuffixes.join(', ')
      if (isSmall) {
        processedPrompt += `, ${additionalSuffixes}, wildlife photography style, national geographic style`
      } else {
        processedPrompt += `, ${additionalSuffixes}, documentary photography style`
      }
    }

    const additionalNegatives = ['cute style', 'adorable', 'kawaii', 'chibi', 'cartoon', 'illustrated', 'animated', 'stylized', 'unrealistic proportions', 'big eyes', 'simplified features', 'cel shaded', 'disney', 'pixar', 'dreamworks', '3d render', 'cgi']
    const missingNegatives = additionalNegatives.filter(neg => !processedNegativePrompt.toLowerCase().includes(neg.toLowerCase()))

    if (missingNegatives.length > 0) {
      processedNegativePrompt += ', ' + missingNegatives.join(', ')
    }
  }

  return { prompt: processedPrompt, negativePrompt: processedNegativePrompt }
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

    // 🔥 强制后处理：确保 realistic 风格规则被执行
    let finalPrompt = prompt
    let finalNegativePrompt = negativePrompt || ''

    if (imageStyle === 'realistic') {
      const processed = enforceRealisticStyle(finalPrompt, finalNegativePrompt)
      finalPrompt = processed.prompt
      finalNegativePrompt = processed.negativePrompt
      console.log('[Video Agent] ✅ Enforced realistic style')
    }

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

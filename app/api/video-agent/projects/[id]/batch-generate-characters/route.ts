/**
 * Video Agent - 批量生成人物图片 API
 * POST /api/video-agent/projects/[id]/batch-generate-characters
 *
 * 批量为所有人物生成参考图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'
import { ImageGenerationRequest } from '@/lib/types/image'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 🔥 强制后处理：确保 realistic 风格的规则被严格执行
 */
function enforceRealisticStyle(prompt: string, negativePrompt: string, characterName: string): {
  prompt: string
  negativePrompt: string
} {
  const isSmall = /\b(small|tiny|little|baby|cub|juvenile|toddler)\b/i.test(prompt)
  const isAnimal = /\b(cat|cats|dog|dogs|puppy|puppies|kitten|kittens|lamb|lambs|sheep|rabbit|rabbits|bunny|bunnies|bird|birds|fox|foxes|tiger|tigers|lion|lions|bear|bears|wolf|wolves|deer|mouse|mice|hamster|hamsters|squirrel|squirrels|raccoon|raccoons|hedgehog|hedgehogs|otter|otters|seal|seals|penguin|penguins|owl|owls|eagle|eagles|hawk|hawks|parrot|parrots|duck|ducks|chicken|chickens|pig|pigs|cow|cows|calf|calves|horse|horses|foal|foals|goat|goats|donkey|donkeys|zebra|zebras|giraffe|giraffes|elephant|elephants|rhino|rhinos|hippo|hippos|monkey|monkeys|ape|apes|gorilla|gorillas|panda|pandas|koala|koalas|kangaroo|kangaroos|dolphin|dolphins|whale|whales|shark|sharks|fish|fishes|turtle|turtles|frog|frogs|lizard|lizards|snake|snakes|crocodile|crocodiles|alligator|alligators|dragon|dragons|chihuahua|chihuahuas|poodle|poodles|bulldog|bulldogs|beagle|beagles|husky|huskies|labrador|labradors|retriever|retrievers|terrier|terriers|pug|pugs|corgi|corgis|dachshund|dachshunds|spaniel|spaniels|shepherd|shepherds)\b/i.test(prompt)
  const isAnthropomorphic = isAnimal && /\b(wearing|dressed|clothes|shirt|sweater|jacket|coat|hat|scarf|pants|shoes|boots|glasses|necklace|bracelet|ring)\b/i.test(prompt)

  let processedPrompt = prompt
  let processedNegativePrompt = negativePrompt

  console.log('[Enforce Realistic] Character:', {
    characterName,
    isSmall,
    isAnimal,
    isAnthropomorphic
  })

  // 🔥 规则: 所有动物（realistic 风格下） → 强制写实
  // 不管是大是小、是否拟人化，所有动物都应该是真实照片
  if (isAnimal) {
    // 强制添加前缀
    if (!/^realistic photograph of/i.test(processedPrompt)) {
      processedPrompt = 'realistic photograph of ' + processedPrompt
    }

    // 强制添加后缀
    const requiredSuffixes = [
      'real photo',
      'not illustration',
      'not cartoon',
      'not 3d render',
      'not animated',
      'not drawn',
      'photorealistic'
    ]

    const missingSuffixes = requiredSuffixes.filter(suffix =>
      !processedPrompt.toLowerCase().includes(suffix.toLowerCase())
    )

    if (missingSuffixes.length > 0) {
      const additionalSuffixes = missingSuffixes.join(', ')
      if (isSmall) {
        processedPrompt += `, ${additionalSuffixes}, wildlife photography style, national geographic style`
      } else {
        processedPrompt += `, ${additionalSuffixes}, documentary photography style`
      }
    }

    // 强制增强 negative prompt
    const additionalNegatives = [
      'cute style',
      'adorable',
      'kawaii',
      'chibi',
      'cartoon',
      'illustrated',
      'animated',
      'stylized',
      'unrealistic proportions',
      'big eyes',
      'simplified features',
      'cel shaded',
      'disney',
      'pixar',
      'dreamworks',
      '3d render',
      'cgi'
    ]

    const missingNegatives = additionalNegatives.filter(neg =>
      !processedNegativePrompt.toLowerCase().includes(neg.toLowerCase())
    )

    if (missingNegatives.length > 0) {
      processedNegativePrompt += ', ' + missingNegatives.join(', ')
    }

    console.log('[Enforce Realistic] ✅ Applied:', {
      characterName,
      promptPrefix: processedPrompt.substring(0, 100) + '...',
      addedNegatives: missingNegatives.length
    })
  }

  return {
    prompt: processedPrompt,
    negativePrompt: processedNegativePrompt
  }
}

export const runtime = 'nodejs'
export const maxDuration = 300 // 5分钟超时（批量生成可能需要较长时间）

interface CharacterPrompt {
  characterName: string
  prompt: string
  negativePrompt: string
}

interface BatchGenerationResult {
  characterName: string
  imageUrl?: string
  status: 'success' | 'failed'
  error?: string
}

/**
 * POST /api/video-agent/projects/[id]/batch-generate-characters
 * 批量生成人物图片
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 3. 解析请求参数
    const body = await request.json()
    const { characterPrompts } = body as { characterPrompts: CharacterPrompt[] }

    if (!characterPrompts || !Array.isArray(characterPrompts) || characterPrompts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid character prompts' },
        { status: 400 }
      )
    }

    console.log('[API] Batch generating character images:', {
      projectId,
      count: characterPrompts.length,
      aspectRatio: project.aspect_ratio
    })

    // 4. 批量生成图片
    const generateTasks = characterPrompts.map(async (charPrompt) => {
      try {
        console.log(`[API] Generating image for ${charPrompt.characterName}...`)

        // 🔥 强制后处理：确保 realistic 风格规则被执行（针对项目的 image_style_id）
        const imageStyle = project.image_style_id || 'realistic'
        let finalPrompt = charPrompt.prompt
        let finalNegativePrompt = charPrompt.negativePrompt || ''

        if (imageStyle === 'realistic') {
          const processed = enforceRealisticStyle(finalPrompt, finalNegativePrompt, charPrompt.characterName)
          finalPrompt = processed.prompt
          finalNegativePrompt = processed.negativePrompt
        }

        const request: ImageGenerationRequest = {
          prompt: finalPrompt,
          model: 'seedream-v4',
          negativePrompt: finalNegativePrompt,
          aspectRatio: project.aspect_ratio || '16:9', // 使用项目设置的宽高比
          watermark: false
        }

        const result = await submitImageGeneration(request)

        if (!result.imageUrl) {
          throw new Error('No image URL returned')
        }

        console.log(`[API] Image generated for ${charPrompt.characterName}:`, result.imageUrl)

        return {
          characterName: charPrompt.characterName,
          imageUrl: result.imageUrl,
          status: 'success' as const
        }

      } catch (error: any) {
        console.error(`[API] Failed to generate image for ${charPrompt.characterName}:`, error)

        return {
          characterName: charPrompt.characterName,
          status: 'failed' as const,
          error: error.message || 'Unknown error'
        }
      }
    })

    // 等待所有生成任务完成（允许部分失败）
    const results = await Promise.allSettled(generateTasks)

    const finalResults: BatchGenerationResult[] = results.map((r, index) => {
      if (r.status === 'fulfilled') {
        return r.value
      } else {
        return {
          characterName: characterPrompts[index].characterName,
          status: 'failed' as const,
          error: r.reason?.message || 'Generation failed'
        }
      }
    })

    const successCount = finalResults.filter(r => r.status === 'success').length

    console.log('[API] Batch generation completed:', {
      total: finalResults.length,
      success: successCount,
      failed: finalResults.length - successCount
    })

    // 5. 自动保存成功生成的人物图片到数据库（直接调用数据库，避免 401 认证问题）
    const successfulCharacters = finalResults
      .filter(r => r.status === 'success' && r.imageUrl)

    if (successfulCharacters.length > 0) {
      try {
        // 🔥 修复：直接保存到数据库，不要调用 API（避免 401 错误）
        for (const char of successfulCharacters) {
          // 检查角色是否已存在
          const { data: existingChar } = await supabaseAdmin
            .from('project_characters')
            .select('id')
            .eq('project_id', projectId)
            .eq('character_name', char.characterName)
            .single()

          let characterId: string

          if (existingChar) {
            // 已存在，更新记录
            const { data: updatedChar, error: updateError } = await supabaseAdmin
              .from('project_characters')
              .update({
                source: 'ai_generate'
                // 移除 updated_at：project_characters 表中没有此字段
              } as any)
              .eq('id', existingChar.id)
              .select('id')
              .single()

            if (updateError || !updatedChar) {
              console.error(`[API] Failed to update character ${char.characterName}:`, updateError)
              continue
            }

            characterId = updatedChar.id

            // 删除旧的参考图
            await supabaseAdmin
              .from('character_reference_images')
              .delete()
              .eq('character_id', characterId)
          } else {
            // 不存在，插入新记录
            const { data: newChar, error: insertError } = await supabaseAdmin
              .from('project_characters')
              .insert({
                project_id: projectId,
                character_name: char.characterName,
                source: 'ai_generate'
              } as any)
              .select('id')
              .single()

            if (insertError || !newChar) {
              console.error(`[API] Failed to insert character ${char.characterName}:`, insertError)
              continue
            }

            characterId = newChar.id
          }

          // 插入新的参考图
          const { error: refError } = await supabaseAdmin
            .from('character_reference_images')
            .upsert({
              character_id: characterId,
              image_url: char.imageUrl!,
              image_order: 1
            }, {
              onConflict: 'character_id,image_order',
              ignoreDuplicates: false
            })

          if (refError) {
            console.error(`[API] Failed to save reference image for ${char.characterName}:`, refError)
          }
        }

        console.log('[API] Auto-saved characters to database:', successfulCharacters.length)
      } catch (saveError) {
        console.error('[API] Failed to auto-save characters:', saveError)
        // 不阻塞响应，生成成功就算成功
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results: finalResults,
        total: finalResults.length,
        successCount,
        failedCount: finalResults.length - successCount
      }
    })

  } catch (error: any) {
    console.error('[API] Batch generation failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to batch generate character images',
        details: error.message
      },
      { status: 500 }
    )
  }
})

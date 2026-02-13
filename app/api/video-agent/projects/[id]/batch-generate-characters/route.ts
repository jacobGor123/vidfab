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
import { IMAGE_STYLES, type ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'
import { checkAndDeductCharacterInitialBatch, checkAndDeductCharacterRegenerate } from '@/lib/video-agent/credits-check'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 🔥 强制后处理（方案 A）：统一风格处理
 * 与 character-prompt-generator.ts 中的逻辑保持一致
 */
function enforceStyleConsistency(
  prompt: string,
  negativePrompt: string,
  characterName: string,
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
    characterName,
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
    characterName,
    imageStyle,
    cleanedPrompt: cleanedPrompt.substring(0, 100),
    finalPromptPreview: finalPrompt.substring(0, 150)
  })

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegativePrompt
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
  characterId?: string  // 🔥 新增：返回数据库中的人物 ID
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

    // ✅ 积分检查: 判断是否为初始批量（检查是否有已生成图片的人物）
    const { data: existingCharsWithImages } = await supabaseAdmin
      .from('project_characters')
      .select(`
        id,
        character_reference_images (id)
      `)
      .eq('project_id', projectId)

    // 🔥 关键修复：只有当存在有图片的人物时，才算重新生成
    const hasGeneratedImages = existingCharsWithImages && existingCharsWithImages.some(
      (char: any) => char.character_reference_images && char.character_reference_images.length > 0
    )
    const isInitialBatch = !hasGeneratedImages
    const count = characterPrompts.length

    let creditResult
    if (isInitialBatch) {
      creditResult = await checkAndDeductCharacterInitialBatch(userId)
    } else {
      creditResult = await checkAndDeductCharacterRegenerate(userId, count)
    }

    if (!creditResult.canAfford) {
      return NextResponse.json(
        {
          error: creditResult.error || 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: creditResult.requiredCredits,
          userCredits: creditResult.userCredits
        },
        { status: 402 }
      )
    }

    // 4. 批量生成图片
    const generateTasks = characterPrompts.map(async (charPrompt) => {
      try {
        console.log(`[API] Generating image for ${charPrompt.characterName}...`)

        // 🔥 强制后处理：清理冲突关键词并强制执行风格规则（针对所有风格）
        const imageStyle = project.image_style_id || 'realistic'
        let finalPrompt = charPrompt.prompt
        let finalNegativePrompt = charPrompt.negativePrompt || ''

        // 对所有风格都执行后处理，清理冲突关键词
        const processed = enforceStyleConsistency(
          finalPrompt,
          finalNegativePrompt,
          charPrompt.characterName,
          imageStyle
        )
        finalPrompt = processed.prompt
        finalNegativePrompt = processed.negativePrompt

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

          // 🔥 关键修复：把数据库 ID 回填到返回结果中
          char.characterId = characterId
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

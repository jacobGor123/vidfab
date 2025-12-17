/**
 * Video Agent - 分镜图生成服务
 * 使用 Seedream 4.5 批量生成分镜图 (支持角色一致性)
 */

import { submitImageGeneration } from '../byteplus/image/seedream-api'
import { ImageGenerationRequest } from '@/lib/types/image'

/**
 * 人物配置
 */
export interface CharacterConfig {
  name: string
  reference_images: string[] // 每个角色 1 张参考图 URL
}

/**
 * 镜头数据
 */
export interface Shot {
  shot_number: number
  description: string
  camera_angle: string
  character_action: string
  characters: string[]
  mood: string
  duration_seconds: number
}

/**
 * 图片风格配置
 */
export interface ImageStyle {
  name: string
  style_prompt: string
  negative_prompt: string[]
}

/**
 * 分镜图生成结果
 */
export interface StoryboardResult {
  shot_number: number
  image_url?: string
  status: 'success' | 'failed'
  error?: string
}

/**
 * 预定义图片风格
 */
export const IMAGE_STYLES: Record<string, ImageStyle> = {
  realistic: {
    name: 'Realistic',
    style_prompt: 'photorealistic, high detail, natural lighting, cinematic',
    negative_prompt: ['cartoon', 'anime', 'illustration', 'painting']
  },
  anime: {
    name: 'Anime',
    style_prompt: 'anime style, manga, japanese animation, vibrant colors',
    negative_prompt: ['photorealistic', '3d render']
  },
  cinematic: {
    name: 'Cinematic',
    style_prompt: 'cinematic composition, film grain, dramatic lighting, wide angle',
    negative_prompt: ['amateur', 'low quality']
  },
  cyberpunk: {
    name: 'Cyberpunk',
    style_prompt: 'cyberpunk, neon lights, futuristic, high tech, dystopian',
    negative_prompt: ['medieval', 'natural']
  }
}

/**
 * 构建负面提示词
 */
function buildNegativePrompt(style: ImageStyle, hasReferenceImages: boolean): string {
  const negatives: string[] = []

  // 添加风格相关的负面提示
  if (style.negative_prompt && style.negative_prompt.length > 0) {
    negatives.push(...style.negative_prompt)
  }

  // 如果有参考图，强调避免角色变形
  if (hasReferenceImages) {
    negatives.push(
      'different face',
      'different person',
      'inconsistent character',
      'character variation',
      'wrong identity',
      'face change'
    )
  }

  // 通用质量负面提示
  negatives.push(
    'low quality',
    'blurry',
    'distorted',
    'deformed',
    'ugly',
    'bad anatomy',
    'bad proportions',
    'watermark',
    'text',
    'signature'
  )

  return negatives.join(', ')
}

/**
 * 构建分镜图 Prompt
 */
function buildStoryboardPrompt(
  shot: Shot,
  style: ImageStyle,
  characters: CharacterConfig[],
  hasReferenceImages: boolean
): string {
  const characterNames = Array.isArray(shot.characters) ? shot.characters.join(', ') : ''

  let prompt = ''

  // 如果有参考图，在开头强调角色一致性
  if (hasReferenceImages && characterNames) {
    prompt += `Character consistency is critical. Generate the exact same characters as shown in the reference images. `
    prompt += `The characters are: ${characterNames}. `
  }

  // 场景描述
  prompt += `${shot.description}. `

  // 镜头角度
  prompt += `${shot.camera_angle}. `

  // 角色动作
  prompt += `${shot.character_action}. `

  // 情绪氛围
  prompt += `Mood: ${shot.mood}. `

  // 添加风格提示
  prompt += `${style.style_prompt}. `

  // 如果有参考图，再次强调保持一致性
  if (hasReferenceImages && characterNames) {
    prompt += `Keep all character appearances identical to the reference images. `
    prompt += `Maintain consistent facial features, clothing, and style. `
  }

  // 质量要求
  prompt += `High quality, professional, 16:9 aspect ratio.`

  return prompt
}

/**
 * 生成单张分镜图
 */
export async function generateSingleStoryboard(
  shot: Shot,
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<StoryboardResult> {
  try {
    // 获取涉及的人物参考图（每个角色只取第一张）
    const characterRefs = shot.characters
      .flatMap(charName => {
        const char = characters.find(c => c.name === charName)
        if (!char) {
          console.warn(`[Storyboard Generator] ⚠️  Character "${charName}" not found in character configs`, {
            shotNumber: shot.shot_number,
            requestedCharacter: charName,
            availableCharacters: characters.map(c => c.name)
          })
          return []
        }
        if (!char.reference_images || char.reference_images.length === 0) {
          console.warn(`[Storyboard Generator] ⚠️  Character "${charName}" has no reference images`, {
            shotNumber: shot.shot_number
          })
          return []
        }
        // 每个角色只取第一张参考图（业务规则：每个角色只允许 1 张参考图）
        const referenceImage = char.reference_images[0]
        console.log(`[Storyboard Generator] ✓ Found reference image for "${charName}": ${referenceImage}`)
        return [referenceImage]
      })

    // 构建 prompt，传递是否有参考图的信息
    const hasReferenceImages = characterRefs.length > 0
    const prompt = buildStoryboardPrompt(shot, style, characters, hasReferenceImages)
    const negativePrompt = buildNegativePrompt(style, hasReferenceImages)

    console.log('[Storyboard Generator] Generating storyboard', {
      shotNumber: shot.shot_number,
      shotCharacters: shot.characters,
      hasReferenceImages,
      characterRefsCount: characterRefs.length,
      characterRefs: characterRefs,
      aspectRatio: aspectRatio,
      fullPrompt: prompt,
      negativePrompt: negativePrompt
    })

    const request: ImageGenerationRequest = {
      prompt,
      aspectRatio: aspectRatio,
      images: characterRefs.length > 0 ? characterRefs : undefined,
      watermark: false,
      negativePrompt: negativePrompt
    }

    const result = await submitImageGeneration(request)

    if (!result.imageUrl) {
      throw new Error('No image URL returned from API')
    }

    console.log('[Storyboard Generator] Generation successful', {
      shotNumber: shot.shot_number,
      imageUrl: result.imageUrl
    })

    return {
      shot_number: shot.shot_number,
      image_url: result.imageUrl,
      status: 'success'
    }

  } catch (error) {
    console.error('[Storyboard Generator] Generation failed:', error)

    return {
      shot_number: shot.shot_number,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 批量生成分镜图
 */
export async function batchGenerateStoryboards(
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle
): Promise<StoryboardResult[]> {
  console.log('[Storyboard Generator] Starting batch generation', {
    shotCount: shots.length,
    characterCount: characters.length,
    style: style.name
  })

  // 并行生成所有分镜图,允许部分失败
  const tasks = shots.map(shot =>
    generateSingleStoryboard(shot, characters, style)
  )

  const results = await Promise.allSettled(tasks)

  // 转换结果
  const storyboards = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`Shot ${index + 1} failed:`, result.reason)
      return {
        shot_number: index + 1,
        status: 'failed' as const,
        error: result.reason?.message || 'Unknown error'
      }
    }
  })

  const successCount = storyboards.filter(s => s.status === 'success').length

  console.log('[Storyboard Generator] Batch generation completed', {
    total: shots.length,
    success: successCount,
    failed: shots.length - successCount
  })

  return storyboards
}

/**
 * 重新生成单张分镜图
 */
export async function regenerateStoryboard(
  shot: Shot,
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9',
  seed?: number
): Promise<StoryboardResult> {
  console.log('[Storyboard Generator] Regenerating storyboard', {
    shotNumber: shot.shot_number,
    aspectRatio,
    seed
  })

  // 使用不同的种子值来生成不同的结果
  // 注意: 当前 Seedream API 可能不支持种子参数,这里预留接口

  return generateSingleStoryboard(shot, characters, style, aspectRatio)
}

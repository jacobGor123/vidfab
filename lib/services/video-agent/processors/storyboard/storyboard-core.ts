/**
 * Storyboard Generator - 单张分镜图生成核心逻辑
 */

import { submitImageGeneration } from '../../../byteplus/image/seedream-api'
import { ImageGenerationRequest } from '@/lib/types/image'
import type { CharacterConfig, Shot, ImageStyle, StoryboardResult } from '@/lib/types/video-agent'
import { buildStoryboardPrompt, buildNegativePrompt } from './storyboard-prompt-builder'

/**
 * 生成单张分镜图
 */
export async function generateSingleStoryboard(
  shot: Shot,
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9',
  customPrompt?: string  // 🔥 新增：自定义 prompt 参数
): Promise<StoryboardResult> {
  try {
    console.log('[Storyboard Core] Extracting character references', {
      shotNumber: shot.shot_number,
      shotCharacters: shot.characters,
      availableCharacters: characters.map(c => ({ name: c.name, refCount: c.reference_images?.length || 0 }))
    })

    // 🔥 修复：获取涉及的人物参考图（每个角色只取第一张）
    // 🔥 关键修复：按照人物在场景描述中出现的顺序来排列参考图
    // 使用模糊匹配，因为 shot.characters 可能是完整格式 "Angela (cat, 20s...)"
    // 而 character_name 可能只是简短名称 "Angela"

    // 合并所有文本描述
    const sceneText = `${shot.description} ${shot.character_action}`.toLowerCase()

    // 为每个角色计算在场景中首次出现的位置
    const charactersWithPosition = shot.characters.map(charName => {
      const shortCharName = charName.split('(')[0].trim()
      const position = sceneText.indexOf(shortCharName.toLowerCase())
      return {
        name: charName,
        shortName: shortCharName,
        position: position >= 0 ? position : 9999 // 如果没找到，放到最后
      }
    })

    // 按照在场景中出现的位置排序
    const sortedCharacters = charactersWithPosition.sort((a, b) => a.position - b.position)

    console.log('[Storyboard Core] Character order in scene:', {
      shotNumber: shot.shot_number,
      original: shot.characters,
      sorted: sortedCharacters.map(c => `${c.name} (pos: ${c.position})`)
    })

    // 按排序后的顺序提取参考图
    const characterRefs = sortedCharacters
      .flatMap(({ name: charName, shortName: shortCharName }) => {
        console.log(`[Storyboard Core] Looking up character: "${charName}" (short: "${shortCharName}")`)

        // 🔥 使用简短名称进行模糊匹配（不区分大小写）
        const char = characters.find(c => {
          const shortConfigName = c.name.split('(')[0].trim()
          const isMatch = shortConfigName.toLowerCase() === shortCharName.toLowerCase()
          if (isMatch) {
            console.log(`[Storyboard Core]   ✅ Matched with: "${c.name}"`)
          }
          return isMatch
        })

        if (!char) {
          console.warn(`[Storyboard Core] ❌ Character "${charName}" not found in character configs`, {
            shotNumber: shot.shot_number,
            requestedCharacter: charName,
            shortName: shortCharName,
            availableCharacters: characters.map(c => c.name)
          })
          return []
        }

        if (!char.reference_images || char.reference_images.length === 0) {
          console.warn(`[Storyboard Core] ⚠️  Character "${charName}" has no reference images`, {
            shotNumber: shot.shot_number,
            characterName: char.name
          })
          return []
        }

        // 每个角色只取第一张参考图（业务规则：每个角色只允许 1 张参考图）
        const referenceImage = char.reference_images[0]
        console.log(`[Storyboard Core] 🎨 Using reference image for "${charName}":`, {
          characterConfig: char.name,
          imageUrl: referenceImage.substring(0, 80) + '...',
          totalImages: char.reference_images.length
        })
        return [referenceImage]
      })

    // 构建 prompt，传递是否有参考图的信息
    const hasReferenceImages = characterRefs.length > 0
    // 🔥 如果提供了自定义 prompt，直接使用；否则构建默认 prompt
    const prompt = customPrompt || buildStoryboardPrompt(shot, style, characters, hasReferenceImages)
    const negativePrompt = buildNegativePrompt(style, hasReferenceImages)

    console.log('[Storyboard Core] Generating storyboard', {
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
      model: 'seedream-v4',  // 使用 Seedream V4 模型
      aspectRatio: aspectRatio,
      images: characterRefs.length > 0 ? characterRefs : undefined,
      watermark: false,
      negativePrompt: negativePrompt
    }

    const result = await submitImageGeneration(request)

    if (!result.imageUrl) {
      throw new Error('No image URL returned from API')
    }

    console.log('[Storyboard Core] Generation successful', {
      shotNumber: shot.shot_number,
      imageUrl: result.imageUrl
    })

    return {
      shot_number: shot.shot_number,
      image_url: result.imageUrl,
      status: 'success'
    }

  } catch (error) {
    console.error('[Storyboard Core] Generation failed:', error)

    return {
      shot_number: shot.shot_number,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 重新生成单张分镜图
 */
export async function regenerateStoryboard(
  shot: Shot,
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9',
  seed?: number,
  customPrompt?: string  // 🔥 新增：自定义 prompt 参数
): Promise<StoryboardResult> {
  console.log('[Storyboard Core] Regenerating storyboard', {
    shotNumber: shot.shot_number,
    aspectRatio,
    seed,
    usingCustomPrompt: !!customPrompt
  })

  // 使用不同的种子值来生成不同的结果
  // 注意: 当前 Seedream API 可能不支持种子参数,这里预留接口

  return generateSingleStoryboard(shot, characters, style, aspectRatio, customPrompt)
}

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
    // 🔥 修复：获取涉及的人物参考图（每个角色只取第一张）
    // 🔥 关键修复：按照人物在场景描述中出现的顺序来排列参考图
    // 使用模糊匹配，因为 shot.characters 可能是完整格式 "Angela (cat, 20s...)"
    // 而 character_name 可能只是简短名称 "Angela"

    // 合并所有文本描述（description 现在已包含角色动作）
    const sceneText = shot.description.toLowerCase()

    // Use the passed-in characters config (selected on the server) to extract reference images.
    // IMPORTANT: choose the LAST image as the “latest” to reflect recent user updates.
    // We don't have created_at here, but the server already sorts by image_order.
    const charactersWithRefs = characters
      .filter(c => c.reference_images && c.reference_images.length > 0)
      .map(c => {
        const shortName = c.name.split('(')[0].trim()
        const position = sceneText.indexOf(shortName.toLowerCase())
        const latestRef = c.reference_images[c.reference_images.length - 1]
        return {
          name: c.name,
          position: position >= 0 ? position : 9999,
          refImage: latestRef
        }
      })
      // 按照在场景描述中出现的顺序排序
      .sort((a, b) => a.position - b.position)

    // 提取参考图
    const characterRefs = charactersWithRefs.map(c => c.refImage)

    // 构建 prompt，传递是否有参考图的信息
    const hasReferenceImages = characterRefs.length > 0

    // 🔥 智能解析 customPrompt：支持 JSON 字段和纯文本两种格式
    let prompt: string
    if (customPrompt && customPrompt.trim()) {
      try {
        // 尝试解析为 JSON 字段
        const parsedFields = JSON.parse(customPrompt)

        if (parsedFields && typeof parsedFields === 'object') {
          // 🔥 JSON 字段模式：只允许修改 description（其它字段不再参与分镜图生成）
          const modifiedShot = {
            ...shot,
            description: parsedFields.description || shot.description,
          }
          prompt = buildStoryboardPrompt(modifiedShot, style, characters, hasReferenceImages)
        } else {
          // JSON 解析成功但不是对象，作为纯文本处理
          const modifiedShot = { ...shot, description: customPrompt.trim() }
          prompt = buildStoryboardPrompt(modifiedShot, style, characters, hasReferenceImages)
        }
      } catch {
        // 🔥 纯文本模式（向后兼容）：将整个 customPrompt 作为 description
        const modifiedShot = { ...shot, description: customPrompt.trim() }
        prompt = buildStoryboardPrompt(modifiedShot, style, characters, hasReferenceImages)
      }
    } else {
      // 使用默认的完整 prompt
      prompt = buildStoryboardPrompt(shot, style, characters, hasReferenceImages)
    }

    const negativePrompt = buildNegativePrompt(style, hasReferenceImages)

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

    // 🔥 提取实际使用的人物 IDs（从 charactersWithRefs 映射回原始 characters）
    const usedCharacterIds = charactersWithRefs
      .map(c => characters.find(ch => ch.name === c.name)?.id)
      .filter((id): id is string => Boolean(id))

    return {
      shot_number: shot.shot_number,
      image_url: result.imageUrl,
      status: 'success',
      used_character_ids: usedCharacterIds
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
  // 使用不同的种子值来生成不同的结果
  // 注意: 当前 Seedream API 可能不支持种子参数,这里预留接口

  return generateSingleStoryboard(shot, characters, style, aspectRatio, customPrompt)
}

/**
 * Storyboard Generator - Prompt 构建器
 */

import type { CharacterConfig, Shot, ImageStyle } from '@/lib/types/video-agent'

/**
 * 构建负面提示词
 * 🔥 不限制风格，专注于角色一致性和图片质量
 */
export function buildNegativePrompt(style: ImageStyle, hasReferenceImages: boolean): string {
  const negatives: string[] = []

  // 🔥 如果有参考图，大幅增强避免角色变化的约束
  if (hasReferenceImages) {
    negatives.push(
      // 面部变化
      'different face',
      'different person',
      'changed face',
      'altered face',
      'modified face',
      'wrong face',
      'different facial features',
      'different eyes',
      'different nose',
      'different mouth',
      'different hair',
      'different hairstyle',
      'different hair color',

      // 身份和角色变化
      'inconsistent character',
      'character variation',
      'character inconsistency',
      'wrong identity',
      'wrong character',
      'multiple versions',
      'character change',
      'appearance change',

      // 服装和体型变化
      'different clothing',
      'different outfit',
      'changed clothes',
      'different body type',
      'different skin tone',
      'different age',

      // 整体一致性（移除 style inconsistency，让参考图决定风格）
      'appearance inconsistency',
      'look-alike',
      'similar but different'
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
export function buildStoryboardPrompt(
  shot: Shot,
  style: ImageStyle,
  characters: CharacterConfig[],
  hasReferenceImages: boolean
): string {
  const characterNames = Array.isArray(shot.characters) ? shot.characters.join(', ') : ''

  let prompt = ''

  // 🔥 如果有参考图，在最开头用强烈语气强调角色一致性
  if (hasReferenceImages && characterNames) {
    prompt += `CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters as shown in the reference images. `
    prompt += `Characters in this scene: ${characterNames}. `
    prompt += `MUST maintain 100% identical appearance: same face, same facial features, same hair, same clothing, same body type, same skin tone. `
    prompt += `DO NOT change or modify the character's appearance in ANY way. `
  }

  // 场景描述
  prompt += `Scene: ${shot.description}. `

  // 镜头角度
  prompt += `Camera: ${shot.camera_angle}. `

  // 角色动作
  prompt += `Action: ${shot.character_action}. `

  // 情绪氛围
  prompt += `Mood: ${shot.mood}. `

  // 添加风格提示
  prompt += `Style: ${style.style_prompt}. `

  // 🔥 如果有参考图，再次用强烈语气强调保持一致性
  if (hasReferenceImages && characterNames) {
    prompt += `REMINDER: The character(s) ${characterNames} MUST look EXACTLY like the reference images provided. `
    prompt += `Keep facial structure, eye color, nose shape, mouth shape, hair style, hair color, clothing style, body proportions, and all other details IDENTICAL. `
    prompt += `This is the SAME character from the reference images, not a similar character. `
  }

  // 质量要求
  prompt += `High quality, professional composition.`

  return prompt
}

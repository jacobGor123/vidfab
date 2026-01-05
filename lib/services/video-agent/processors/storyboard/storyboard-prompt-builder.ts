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

  // 🔥 禁止人物重复出现（复制粘贴效果）
  negatives.push(
    'duplicate person',
    'cloned person',
    'repeated person',
    'copy-paste person',
    'same person multiple times',
    'duplicated character',
    'multiple copies',
    'clone effect',
    'repeated character',
    'mirrored duplication'
  )

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
 * 检测脚本是否涉及镜子、倒影等允许重复人物的特殊场景
 */
function isMirrorOrReflectionScene(shot: Shot): boolean {
  const combinedText = `${shot.description} ${shot.character_action}`.toLowerCase()
  const mirrorKeywords = [
    'mirror', 'reflection', 'reflect', 'twin', 'clone', 'duplicate',
    '镜子', '倒影', '镜像', '双胞胎', '克隆', '复制',
    'looking glass', 'mirrored', 'glass reflection', 'water reflection'
  ]
  return mirrorKeywords.some(keyword => combinedText.includes(keyword))
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
  const isMirrorScene = isMirrorOrReflectionScene(shot)

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

  // 🔥 内容强化：禁止人物重复（除非是镜子场景）
  if (!isMirrorScene && characterNames) {
    prompt += `IMPORTANT: Each character should appear ONLY ONCE in the image. `
    prompt += `Do NOT duplicate, clone, or copy-paste the same character multiple times. `
    prompt += `Generate a single instance of each character in their designated position. `
  }

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

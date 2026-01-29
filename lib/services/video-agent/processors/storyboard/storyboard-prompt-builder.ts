/**
 * Storyboard Generator - Prompt 构建器
 */

import type { CharacterConfig, Shot, ImageStyle } from '@/lib/types/video-agent'

// ==================== 角色类型识别工具 ====================

/**
 * 解析后的角色信息
 */
interface ParsedCharacter {
  fullName: string   // 完整格式：'Ginger (orange tabby cat, animated)'
  shortName: string  // 简短名称：'Ginger'
  type: string       // 类型：'cat' | 'man' | 'woman' | etc.
}

/**
 * 从角色描述中提取简化的类型
 *
 * @param description 角色描述，例如 'orange tabby cat, animated'
 * @returns 简化的类型，例如 'cat'
 */
function extractCharacterType(description: string): string {
  const descLower = description.toLowerCase()

  // 🔥 动物类型（按优先级排序，更具体的放前面）
  if (descLower.includes('cat')) return 'cat'
  if (descLower.includes('dog')) return 'dog'
  if (descLower.includes('bird')) return 'bird'
  if (descLower.includes('rabbit')) return 'rabbit'
  if (descLower.includes('bear')) return 'bear'
  if (descLower.includes('lion')) return 'lion'
  if (descLower.includes('tiger')) return 'tiger'
  if (descLower.includes('elephant')) return 'elephant'
  if (descLower.includes('monkey')) return 'monkey'
  if (descLower.includes('panda')) return 'panda'
  if (descLower.includes('fox')) return 'fox'
  if (descLower.includes('wolf')) return 'wolf'
  if (descLower.includes('horse')) return 'horse'
  if (descLower.includes('fish')) return 'fish'
  if (descLower.includes('animal')) return 'animal'

  // 🔥 人类类型（按优先级：更具体的放前面）
  if (descLower.includes('boy')) return 'boy'
  if (descLower.includes('girl')) return 'girl'
  if (descLower.includes('man')) return 'man'
  if (descLower.includes('woman')) return 'woman'
  if (descLower.includes('child')) return 'child'
  if (descLower.includes('kid')) return 'child'
  if (descLower.includes('adult')) return 'adult'
  if (descLower.includes('person')) return 'person'
  if (descLower.includes('human')) return 'person'

  // 🔥 职业相关（次优先级）
  if (descLower.includes('employee')) return 'person'
  if (descLower.includes('cashier')) return 'person'
  if (descLower.includes('worker')) return 'person'
  if (descLower.includes('staff')) return 'person'

  // 如果没有匹配，返回空字符串（不添加类型标识）
  return ''
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 解析角色列表，提取名称和类型
 *
 * @param characters 角色列表，例如 ['Ginger (orange tabby cat, animated)', 'Store Employee (white man, 30s)']
 * @returns 解析后的角色信息数组
 */
function parseCharacters(characters: string[]): ParsedCharacter[] {
  return characters.map(char => {
    // 提取简短名称（括号前的部分）
    const shortName = char.split('(')[0].trim()

    // 提取描述（括号内的部分）
    const descMatch = char.match(/\(([^)]+)\)/)
    const description = descMatch ? descMatch[1] : ''

    // 从描述中提取类型
    const type = extractCharacterType(description)

    return {
      fullName: char,
      shortName,
      type
    }
  })
}

/**
 * 在文本中为角色名添加类型标识（仅首次出现）
 *
 * 例如：
 * - "Ginger stands on its hind legs" → "the cat Ginger stands on its hind legs"
 * - "Store Employee smiles" → "the person Store Employee smiles"
 *
 * @param description 场景描述（现在已包含角色动作）
 * @param parsedCharacters 解析后的角色信息
 * @returns 处理后的描述
 */
function annotateCharacterTypes(
  description: string,
  parsedCharacters: ParsedCharacter[]
): { description: string } {
  let newDescription = description

  // 为每个角色添加类型标识
  for (const char of parsedCharacters) {
    // 如果没有识别出类型，跳过
    if (!char.type) {
      continue
    }

    // 创建正则表达式：匹配完整单词（避免部分匹配）
    const regex = new RegExp(`\\b${escapeRegex(char.shortName)}\\b`, 'i')
    const replacement = `the ${char.type} ${char.shortName}`

    // 在 description 中查找并替换首次出现
    if (regex.test(newDescription)) {
      newDescription = newDescription.replace(regex, replacement)
    }
  }

  return {
    description: newDescription
  }
}

/**
 * 构建简化的角色声明
 *
 * 例如：'Ginger (orange tabby cat, animated)' → 'Ginger (cat)'
 *
 * @param parsedCharacters 解析后的角色信息
 * @returns 简化的角色声明字符串
 */
function buildSimplifiedCharacterList(parsedCharacters: ParsedCharacter[]): string {
  return parsedCharacters
    .map(char => {
      if (char.type) {
        return `${char.shortName} (${char.type})`
      }
      return char.shortName
    })
    .join(', ')
}

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
  const combinedText = shot.description.toLowerCase()
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
  const isMirrorScene = isMirrorOrReflectionScene(shot)

  // 🔥 解析角色列表，提取名称和类型
  const parsedCharacters = parseCharacters(shot.characters || [])
  const simplifiedCharacterList = buildSimplifiedCharacterList(parsedCharacters)

  // 🔥 在描述中添加角色类型标识（仅首次出现）
  // ✅ description 现在已包含角色动作，无需单独处理 character_action
  const annotated = annotateCharacterTypes(
    shot.description,
    parsedCharacters
  )

  let prompt = ''

  // 🔥 简化的角色声明（开头）
  if (parsedCharacters.length > 0) {
    prompt += `Characters: ${simplifiedCharacterList}. `
  }

  // 🔥 如果有参考图，在最开头用强烈语气强调角色一致性
  if (hasReferenceImages && parsedCharacters.length > 0) {
    prompt += `CRITICAL: Generate EXACTLY THE SAME characters as shown in the reference images. `
    prompt += `MUST maintain 100% identical appearance: same face, facial features, hair, clothing, body type, skin tone. `
    prompt += `DO NOT change or modify the character's appearance in ANY way. `
  }

  // 🔥 场景描述（已标注角色类型，已包含角色动作）
  prompt += `Scene: ${annotated.description}. `

  // camera_angle / mood removed: no longer used to build storyboard image prompts

  // 🔥 内容强化：禁止人物重复（除非是镜子场景）
  if (!isMirrorScene && parsedCharacters.length > 0) {
    prompt += `IMPORTANT: Each character should appear ONLY ONCE in the image. `
    prompt += `Do NOT duplicate, clone, or copy-paste the same character multiple times. `
    prompt += `Generate a single instance of each character in their designated position. `
  }

  // 添加风格提示
  prompt += `Style: ${style.style_prompt}. `

  // 🔥 如果有参考图，再次用强烈语气强调保持一致性
  if (hasReferenceImages && parsedCharacters.length > 0) {
    const characterNamesList = parsedCharacters.map(c => c.shortName).join(', ')
    prompt += `REMINDER: The character(s) ${characterNamesList} MUST look EXACTLY like the reference images provided. `
    prompt += `Keep facial structure, eye color, nose shape, mouth shape, hair style, hair color, clothing style, body proportions, and all other details IDENTICAL. `
    prompt += `This is the SAME character from the reference images, not a similar character. `
  }

  // 质量要求
  prompt += `High quality, professional composition.`

  return prompt
}

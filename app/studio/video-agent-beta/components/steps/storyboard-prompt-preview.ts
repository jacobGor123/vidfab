/**
 * Storyboard Prompt Preview Builder
 * 在前端构建完整的 prompt 用于预览
 * 复制后端的 buildStoryboardPrompt 逻辑
 */

interface StoryboardFields {
  description: string
  character_action: string
}

interface CharacterInfo {
  characters: string[]
  hasReferenceImages: boolean
}

// ==================== 角色类型识别工具（复制自后端）====================

interface ParsedCharacter {
  fullName: string
  shortName: string
  type: string
}

/**
 * 从角色描述中提取简化的类型
 */
function extractCharacterType(description: string): string {
  const descLower = description.toLowerCase()

  // 动物类型
  if (descLower.includes('cat')) return 'cat'
  if (descLower.includes('dog')) return 'dog'
  if (descLower.includes('bird')) return 'bird'
  if (descLower.includes('rabbit')) return 'rabbit'
  if (descLower.includes('animal')) return 'animal'

  // 人类类型
  if (descLower.includes('boy')) return 'boy'
  if (descLower.includes('girl')) return 'girl'
  if (descLower.includes('man')) return 'man'
  if (descLower.includes('woman')) return 'woman'
  if (descLower.includes('child') || descLower.includes('kid')) return 'child'
  if (descLower.includes('person') || descLower.includes('human')) return 'person'

  // 职业相关
  if (descLower.includes('employee') || descLower.includes('cashier') ||
      descLower.includes('worker') || descLower.includes('staff')) return 'person'

  return ''
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 解析角色列表
 */
function parseCharacters(characters: string[]): ParsedCharacter[] {
  return characters.map(char => {
    const shortName = char.split('(')[0].trim()
    const descMatch = char.match(/\(([^)]+)\)/)
    const description = descMatch ? descMatch[1] : ''
    const type = extractCharacterType(description)

    return { fullName: char, shortName, type }
  })
}

/**
 * 在文本中为角色名添加类型标识
 */
function annotateCharacterTypes(
  description: string,
  characterAction: string,
  parsedCharacters: ParsedCharacter[]
): { description: string; characterAction: string } {
  let newDescription = description
  let newCharacterAction = characterAction

  for (const char of parsedCharacters) {
    if (!char.type) continue

    const regex = new RegExp(`\\b${escapeRegex(char.shortName)}\\b`, 'i')
    const replacement = `the ${char.type} ${char.shortName}`

    if (regex.test(newDescription)) {
      newDescription = newDescription.replace(regex, replacement)
    } else if (regex.test(newCharacterAction)) {
      newCharacterAction = newCharacterAction.replace(regex, replacement)
    }
  }

  return { description: newDescription, characterAction: newCharacterAction }
}

/**
 * 构建简化的角色声明
 */
function buildSimplifiedCharacterList(parsedCharacters: ParsedCharacter[]): string {
  return parsedCharacters
    .map(char => char.type ? `${char.shortName} (${char.type})` : char.shortName)
    .join(', ')
}

/**
 * 构建完整的分镜图 Prompt（前端预览版本）
 * 注意：这是简化版，不包含所有后端逻辑（如镜子场景检测等）
 */
export function buildStoryboardPromptPreview(
  fields: StoryboardFields,
  characterInfo?: CharacterInfo,
  styleName: string = 'Photorealistic'
): string {
  const hasReferenceImages = characterInfo?.hasReferenceImages || false

  // 🔥 解析角色列表，提取名称和类型
  const parsedCharacters = characterInfo?.characters
    ? parseCharacters(characterInfo.characters)
    : []
  const simplifiedCharacterList = buildSimplifiedCharacterList(parsedCharacters)

  // 🔥 在描述中添加角色类型标识（仅首次出现）
  const annotated = annotateCharacterTypes(
    fields.description || '',
    fields.character_action || '',
    parsedCharacters
  )

  let prompt = ''

  // 🔥 简化的角色声明（开头）
  if (parsedCharacters.length > 0) {
    prompt += `Characters: ${simplifiedCharacterList}. `
  }

  // 🔥 如果有参考图，在最开头强调角色一致性
  if (hasReferenceImages && parsedCharacters.length > 0) {
    prompt += `CRITICAL: Generate EXACTLY THE SAME characters as shown in the reference images. `
    prompt += `MUST maintain 100% identical appearance: same face, facial features, hair, clothing, body type, skin tone. `
    prompt += `DO NOT change or modify the character's appearance in ANY way. `
  }

  // 🔥 场景描述（已标注角色类型）
  if (annotated.description) {
    prompt += `Scene: ${annotated.description}. `
  }

  // 🔥 角色动作（已标注角色类型）
  if (annotated.characterAction) {
    prompt += `Action: ${annotated.characterAction}. `
  }

  // 禁止人物重复
  if (parsedCharacters.length > 0) {
    prompt += `IMPORTANT: Each character should appear ONLY ONCE in the image. `
    prompt += `Do NOT duplicate, clone, or copy-paste the same character multiple times. `
    prompt += `Generate a single instance of each character in their designated position. `
  }

  // 添加风格提示
  prompt += `Style: ${styleName} style. `

  // 🔥 如果有参考图，再次强调保持一致性
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

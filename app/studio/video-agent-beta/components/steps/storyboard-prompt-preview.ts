/**
 * Storyboard Prompt Preview Builder
 * 在前端构建完整的 prompt 用于预览
 * 复制后端的 buildStoryboardPrompt 逻辑
 */

interface StoryboardFields {
  description: string
  camera_angle: string
  character_action: string
  mood: string
}

interface CharacterInfo {
  characters: string[]
  hasReferenceImages: boolean
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
  const characterNames = characterInfo?.characters?.join(', ') || ''
  const hasReferenceImages = characterInfo?.hasReferenceImages || false

  let prompt = ''

  // 🔥 如果有参考图，在最开头强调角色一致性
  if (hasReferenceImages && characterNames) {
    prompt += `CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters as shown in the reference images. `
    prompt += `Characters in this scene: ${characterNames}. `
    prompt += `MUST maintain 100% identical appearance: same face, same facial features, same hair, same clothing, same body type, same skin tone. `
    prompt += `DO NOT change or modify the character's appearance in ANY way. `
  }

  // 场景描述
  if (fields.description) {
    prompt += `Scene: ${fields.description}. `
  }

  // 镜头角度
  if (fields.camera_angle) {
    prompt += `Camera: ${fields.camera_angle}. `
  }

  // 角色动作
  if (fields.character_action) {
    prompt += `Action: ${fields.character_action}. `
  }

  // 情绪氛围
  if (fields.mood) {
    prompt += `Mood: ${fields.mood}. `
  }

  // 禁止人物重复
  if (characterNames) {
    prompt += `IMPORTANT: Each character should appear ONLY ONCE in the image. `
    prompt += `Do NOT duplicate, clone, or copy-paste the same character multiple times. `
    prompt += `Generate a single instance of each character in their designated position. `
  }

  // 添加风格提示
  prompt += `Style: ${styleName} style. `

  // 🔥 如果有参考图，再次强调保持一致性
  if (hasReferenceImages && characterNames) {
    prompt += `REMINDER: The character(s) ${characterNames} MUST look EXACTLY like the reference images provided. `
    prompt += `Keep facial structure, eye color, nose shape, mouth shape, hair style, hair color, clothing style, body proportions, and all other details IDENTICAL. `
    prompt += `This is the SAME character from the reference images, not a similar character. `
  }

  // 质量要求
  prompt += `High quality, professional composition.`

  return prompt
}

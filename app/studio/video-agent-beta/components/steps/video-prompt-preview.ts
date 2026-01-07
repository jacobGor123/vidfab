/**
 * Video Prompt Preview Builder
 * 在前端构建完整的视频 prompt 用于预览
 */

interface VideoFields {
  description: string
  character_action: string
}

/**
 * 构建完整的视频 Prompt（前端预览版本 - BytePlus 模式）
 */
export function buildVideoPromptPreview(
  fields: VideoFields,
  mode: 'veo3' | 'byteplus' = 'byteplus'
): string {
  let prompt = ''

  if (mode === 'byteplus') {
    // BytePlus 模式：包含角色一致性约束
    prompt += `Maintain exact character appearance and features from the reference image. `
    prompt += `${fields.description}. `
    prompt += `${fields.character_action}. `
    prompt += `Keep all character visual details consistent with the reference. `
    prompt += `No text, no subtitles, no captions, no words on screen.`
  } else {
    // Veo3 模式：简单 prompt
    prompt += `${fields.description}. `
    prompt += `${fields.character_action}. `
    prompt += `No text, no subtitles, no captions, no words on screen.`
  }

  return prompt
}

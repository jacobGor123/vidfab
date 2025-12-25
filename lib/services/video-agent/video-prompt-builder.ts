/**
 * Video Agent - Video Prompt Builder
 * 构建视频生成 Prompt
 */

import type { Shot } from '@/lib/types/video-agent'

/**
 * 构建视频生成 Prompt
 * 结合场景描述、角色动作、镜头角度、情绪氛围
 */
export function buildVideoPrompt(shot: Shot): string {
  let prompt = ''

  // 1. 场景描述（核心内容）
  prompt += shot.description

  // 2. 角色动作（具体行为）
  if (shot.character_action) {
    prompt += `. ${shot.character_action}`
  }

  // 3. 镜头角度（视觉引导）
  if (shot.camera_angle) {
    prompt += `. ${shot.camera_angle}`
  }

  // 4. 情绪氛围（情感基调）
  if (shot.mood) {
    prompt += `. Mood: ${shot.mood}`
  }

  // 5. 运动提示（确保视频有动态）
  prompt += '. Smooth camera movement, natural motion, cinematic.'

  // 6. 禁止字幕和文字（避免 API 自动生成字幕）
  prompt += '. No text, no subtitles, no captions, no words on screen.'

  return prompt
}

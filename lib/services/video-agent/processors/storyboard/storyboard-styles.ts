/**
 * Storyboard Generator - 图片风格定义
 */

import type { ImageStyle } from '@/lib/types/video-agent'

/**
 * 预定义图片风格
 * 🔥 移除风格相关的 negative prompt，让 AI 根据参考图自动判断风格
 */
export const IMAGE_STYLES: Record<string, ImageStyle> = {
  realistic: {
    name: 'Realistic',
    style_prompt: 'photorealistic, high detail, natural lighting, cinematic',
    negative_prompt: []  // 🔥 移除风格限制，让参考图决定风格
  },
  anime: {
    name: 'Anime',
    style_prompt: 'anime style, manga, japanese animation, vibrant colors',
    negative_prompt: []  // 🔥 移除风格限制
  },
  cinematic: {
    name: 'Cinematic',
    style_prompt: 'cinematic composition, film grain, dramatic lighting, wide angle',
    negative_prompt: []  // 🔥 移除风格限制
  },
  cyberpunk: {
    name: 'Cyberpunk',
    style_prompt: 'cyberpunk, neon lights, futuristic, high tech, dystopian',
    negative_prompt: []  // 🔥 移除风格限制
  }
}

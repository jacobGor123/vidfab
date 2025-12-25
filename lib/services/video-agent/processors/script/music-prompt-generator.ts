/**
 * Script Analyzer - 音乐 Prompt 生成器
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Shot } from '@/lib/types/video-agent'
import { MODEL_NAME } from './constants'

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * 🔥 生成 Suno 音乐 prompt（使用 Google Generative AI）
 * 基于脚本分析结果，生成适合的背景音乐描述
 */
export async function generateMusicPrompt(
  script: string,
  storyStyle: string,
  shots: Shot[]
): Promise<string> {
  console.log('[Music Prompt Generator] 生成 Suno 音乐 prompt', {
    storyStyle,
    shotCount: shots.length
  })

  // 提取所有场景描述和情绪
  const sceneDescriptions = shots.map(s => s.description).join('. ')
  const moods = [...new Set(shots.map(s => s.mood))].join(', ')

  const prompt = `Generate a background music description for a ${storyStyle} video story.

Story context:
${script}

Scene descriptions: ${sceneDescriptions}

Emotional tones: ${moods}

Create a concise music prompt (max 200 characters) that describes:
1. Musical genre and style
2. Tempo and energy level
3. Instruments or sound characteristics
4. Emotional atmosphere

Output only the music prompt in English, without any explanation or additional text.`

  try {
    // 获取模型
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 200,
      }
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    let musicPrompt = response.text().trim()

    // 限制长度（Suno 推荐 200 字符以内）
    if (musicPrompt.length > 200) {
      musicPrompt = musicPrompt.substring(0, 197) + '...'
    }

    console.log('[Music Prompt Generator] 音乐 prompt 生成完成:', musicPrompt)

    return musicPrompt

  } catch (error: any) {
    console.error('[Music Prompt Generator] 音乐 prompt 生成失败:', error)
    // 返回默认 prompt
    return `Cinematic ${storyStyle} music, emotional and atmospheric`
  }
}

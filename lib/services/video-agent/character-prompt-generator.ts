/**
 * Video Agent - 人物 Prompt 自动生成服务
 * 使用 Gemini 3 Pro 根据脚本分析结果为每个人物生成专业的生图 prompt
 */

import { GoogleGenAI } from '@google/genai'
import { ScriptAnalysisResult } from './script-analyzer'

// 初始化 Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  apiVersion: 'v1alpha'
})

const GEMINI_MODEL = 'gemini-3-pro-preview'

/**
 * 图片风格配置
 */
export const IMAGE_STYLES = {
  realistic: {
    name: 'Realistic',
    description: 'Photorealistic, natural lighting',
    promptSuffix: 'photorealistic, high detail, natural lighting, professional photography, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3'
  },
  anime: {
    name: 'Anime',
    description: 'Japanese animation style',
    promptSuffix: 'anime style, manga, japanese animation, vibrant colors, cel shaded, by Makoto Shinkai, studio ghibli style, highly detailed'
  },
  fantasy: {
    name: 'Fantasy',
    description: 'Epic fantasy art style',
    promptSuffix: 'fantasy art, epic, magical, detailed, concept art, artstation, by greg rutkowski, dramatic lighting, vibrant colors'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Futuristic sci-fi aesthetic',
    promptSuffix: 'cyberpunk, neon lights, futuristic, high tech, dystopian, sci-fi, blade runner style, synthwave, glowing elements'
  },
  'oil-painting': {
    name: 'Oil Painting',
    description: 'Classic oil painting style',
    promptSuffix: 'oil painting, classical art, fine art, brush strokes, canvas texture, renaissance style, museum quality, detailed'
  },
  '3d-render': {
    name: '3D Render',
    description: 'Modern 3D rendered',
    promptSuffix: '3d render, octane render, unreal engine, highly detailed, smooth, sharp focus, trending on artstation, ray tracing'
  },
  watercolor: {
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    promptSuffix: 'watercolor painting, soft colors, artistic, flowing, delicate, pastel tones, hand painted, traditional art'
  },
  'comic-book': {
    name: 'Comic Book',
    description: 'Comic book illustration',
    promptSuffix: 'comic book style, bold lines, vibrant colors, halftone dots, graphic novel, pop art, dynamic composition'
  }
}

export type ImageStyle = keyof typeof IMAGE_STYLES

/**
 * 人物 Prompt 结果
 */
export interface CharacterPrompt {
  characterName: string
  prompt: string
  negativePrompt: string
}

/**
 * 构建 Prompt 生成任务
 */
function buildCharacterPromptGenerationTask(
  scriptAnalysis: ScriptAnalysisResult,
  imageStyle: ImageStyle
): string {
  const styleConfig = IMAGE_STYLES[imageStyle]
  const characters = scriptAnalysis.characters || []
  const shots = scriptAnalysis.shots || []

  // 收集每个人物在分镜中的描述
  const characterContexts = characters.map(char => {
    const appearances = shots
      .filter(shot => shot.characters?.includes(char))
      .map(shot => ({
        shotNumber: shot.shot_number,
        description: shot.description,
        action: shot.character_action,
        mood: shot.mood
      }))

    return {
      name: char,
      appearances
    }
  })

  return `# 任务: 为视频人物生成专业的生图 Prompt

你是一位资深的 AI 图像生成专家。请根据视频脚本分析结果，为每个人物生成高质量的生图 prompt。

## 视频信息

**剧情风格**: ${scriptAnalysis.story_style}
**图片风格**: ${styleConfig.name} (${styleConfig.description})
**人物列表**: ${characters.join(', ')}

## 人物在分镜中的描述

${characterContexts.map(ctx => `
### ${ctx.name}
出现在以下分镜中:
${ctx.appearances.map(app => `
- **Shot ${app.shotNumber}**
  - 场景: ${app.description}
  - 动作: ${app.action}
  - 情绪: ${app.mood}
`).join('\n')}
`).join('\n')}

## Prompt 生成要求

### 1. 核心原则
- **一致性第一**: 确保同一人物在所有分镜中保持外观一致
- **风格匹配**: 完全符合 ${styleConfig.name} 风格
- **细节丰富**: 包含足够的视觉细节（外貌、服装、特征）
- **英文输出**: 所有 prompt 必须是英文

### 2. Prompt 结构

每个人物的 prompt 应包含以下部分（按顺序）:

**a) 主体描述**
- 人物类型（human, creature, robot, etc.）
- 性别/年龄（如适用）
- 核心特征（发型、面部特征、体型）

**b) 服装与配饰**
- 详细的服装描述
- 配饰和道具

**c) 外观细节**
- 皮肤/表面质感
- 眼睛颜色和表情
- 独特标识（疤痕、纹身、特殊标记）

**d) 风格关键词**
- 必须添加: "${styleConfig.promptSuffix}"
- 这些关键词确保风格一致性

**e) 一致性强化**
- 添加: "consistent character design, character reference sheet, turnaround"
- 确保 AI 生成一致的外观

### 3. Negative Prompt 要求

为每个人物生成 negative prompt，避免:
- 低质量: "low quality, blurry, distorted, deformed, ugly, bad anatomy"
- 不一致: "inconsistent, multiple characters, different person, character variation"
- 风格冲突: 列出与目标风格冲突的关键词
- 其他: "watermark, text, signature, out of frame"

### 4. 示例格式

假设人物是 "Young Wizard":
- **Prompt**: "A young male wizard in his 20s, short messy brown hair, bright blue eyes, wearing a dark blue robe with silver star patterns, holding a wooden staff with a crystal top, confident expression, photorealistic, high detail, natural lighting, consistent character design, character reference sheet"
- **Negative Prompt**: "low quality, blurry, old person, female, inconsistent, multiple characters, cartoon, anime, watermark"

## 输出格式

**严格的 JSON 格式，不要包含 markdown 标记：**

{
  "characterPrompts": [
    {
      "characterName": "Prince",
      "prompt": "Detailed character prompt here...",
      "negativePrompt": "Negative prompt here..."
    }
  ]
}

**重要提示:**
- 直接输出纯 JSON
- 确保为 ${characters.length} 个人物生成 prompt
- 所有内容必须是英文
- Prompt 长度: 50-150 词
- 包含风格关键词和一致性关键词`
}

/**
 * 生成人物 Prompts
 * @param scriptAnalysis 脚本分析结果
 * @param imageStyle 图片风格
 * @returns 每个人物的生图 prompt
 */
export async function generateCharacterPrompts(
  scriptAnalysis: ScriptAnalysisResult,
  imageStyle: ImageStyle
): Promise<CharacterPrompt[]> {
  console.log('[Character Prompt Generator] Starting generation', {
    characters: scriptAnalysis.characters,
    imageStyle
  })

  const prompt = buildCharacterPromptGenerationTask(scriptAnalysis, imageStyle)

  try {
    // 调用 Gemini API
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    })

    const content = response.text

    if (!content) {
      throw new Error('Empty response from Gemini 3 Pro')
    }

    console.log('[Character Prompt Generator] Received response:', {
      contentLength: content.length,
      preview: content.substring(0, 200)
    })

    // 清理响应
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '')
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '')
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '')
    }

    // 解析 JSON
    let result: { characterPrompts: CharacterPrompt[] }
    try {
      result = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('[Character Prompt Generator] JSON parse error:', parseError)
      console.error('[Character Prompt Generator] Raw content:', content)
      throw new Error('Invalid JSON response from Gemini 3 Pro')
    }

    // 验证结果
    if (!result.characterPrompts || !Array.isArray(result.characterPrompts)) {
      throw new Error('Invalid character prompts format')
    }

    console.log('[Character Prompt Generator] Generation completed:', {
      count: result.characterPrompts.length
    })

    return result.characterPrompts

  } catch (error) {
    console.error('[Character Prompt Generator] Generation failed:', error)
    throw error
  }
}

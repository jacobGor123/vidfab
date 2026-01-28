/**
 * Video Agent - 角色图片分析服务
 * 使用 Gemini 2.0 Flash Vision API 分析角色图片，自动生成视觉描述
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MODEL_NAME } from './processors/script/constants'

// 初始化 Gemini AI client（复用相同配置）
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

const GEMINI_MODEL = MODEL_NAME

/**
 * 角色图片分析结果
 */
export interface CharacterImageAnalysis {
  description: string  // 详细的视觉描述
  shortDescription: string  // 简短摘要
}

/**
 * 从 URL 获取图片数据
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // 从 URL 或 Content-Type 推断 MIME 类型
    let mimeType = response.headers.get('content-type') || 'image/jpeg'

    // 如果 Content-Type 不可用，从 URL 扩展名推断
    if (!mimeType.startsWith('image/')) {
      if (imageUrl.endsWith('.png')) mimeType = 'image/png'
      else if (imageUrl.endsWith('.webp')) mimeType = 'image/webp'
      else if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) mimeType = 'image/jpeg'
      else mimeType = 'image/jpeg' // 默认
    }

    return { mimeType, data: base64 }
  } catch (error) {
    console.error('[Character Image Analyzer] Failed to fetch image:', error)
    throw new Error('Failed to fetch image from URL')
  }
}

/**
 * 分析角色图片，生成详细的视觉描述
 * @param imageUrl 角色图片 URL
 * @param characterName 角色名称（可选，用于上下文）
 * @returns 角色视觉描述
 */
export async function analyzeCharacterImage(
  imageUrl: string,
  characterName?: string
): Promise<CharacterImageAnalysis> {
  console.log('[Character Image Analyzer] Starting analysis', {
    imageUrl,
    characterName
  })

  try {
    // 获取图片数据
    const { mimeType, data } = await fetchImageAsBase64(imageUrl)

    // 构建分析提示词
    const prompt = `You are an expert at analyzing character reference images for AI video generation.

Analyze this character image${characterName ? ` (${characterName})` : ''} and provide a concise visual description of THE CHARACTER ONLY.

## Critical Rules:

1. **IGNORE THE BACKGROUND AND SCENE**
   - DO NOT describe the setting, environment, or background
   - DO NOT mention furniture, props, or other objects in the scene
   - DO NOT describe other people or characters
   - ONLY focus on the main character's appearance

2. **Character Description Focus:**
   - Species/type (human, animal, creature, robot, etc.)
   - Physical features (face, body, size)
   - Hair/fur color, style, and texture
   - Eye color and shape
   - Skin/surface color and texture
   - Clothing and what they're wearing
   - Accessories worn on the body
   - Distinctive marks (scars, tattoos, patterns, etc.)

3. **Keep It Concise:**
   - 40-60 words maximum for the main description
   - Focus on the most distinctive visual features
   - Use clear, simple language
   - Suitable for AI image generation

## Output Format:

Provide a JSON object:

{
  "description": "A concise description (40-60 words) of ONLY the character's appearance, not the scene or background.",
  "shortDescription": "A very brief summary (10-15 words) of the character's most distinctive features."
}

**Example:**
{
  "description": "Yellow electric mouse creature with large pointed ears with black tips, round red cheeks, black beady eyes, small smiling mouth, lightning bolt-shaped tail, small raised arms.",
  "shortDescription": "Yellow electric mouse with pointed ears and red cheeks"
}

**Important:**
- Output ONLY the JSON object
- All text must be in English
- DO NOT describe the background, scene, setting, or environment
- Only describe the character itself`

    // 调用 Gemini Vision API
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL
    })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data
        }
      },
      prompt
    ])

    const response = await result.response
    const content = response.text()

    if (!content) {
      throw new Error('Empty response from Gemini Vision API')
    }

    console.log('[Character Image Analyzer] Received response:', {
      contentLength: content.length,
      preview: content.substring(0, 200)
    })

    // 清理响应（移除可能的 markdown 标记）
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
    let parsedResult: CharacterImageAnalysis
    try {
      parsedResult = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('[Character Image Analyzer] JSON parse error:', parseError)
      console.error('[Character Image Analyzer] Raw content:', content)
      throw new Error('Invalid JSON response from Gemini Vision API')
    }

    // 验证结果
    if (!parsedResult.description || !parsedResult.shortDescription) {
      throw new Error('Invalid analysis format: missing required fields')
    }

    console.log('[Character Image Analyzer] Analysis completed:', {
      descriptionLength: parsedResult.description.length,
      shortDescriptionLength: parsedResult.shortDescription.length
    })

    return parsedResult

  } catch (error) {
    console.error('[Character Image Analyzer] Analysis failed:', error)
    throw error
  }
}

/**
 * 批量分析多个角色图片
 * @param imageUrls 图片 URL 数组，格式：{ url: string, characterName?: string }[]
 * @returns 分析结果数组
 */
export async function analyzeCharacterImagesInBatch(
  imageUrls: Array<{ url: string; characterName?: string }>
): Promise<Array<CharacterImageAnalysis | null>> {
  console.log('[Character Image Analyzer] Starting batch analysis', {
    count: imageUrls.length
  })

  const results = await Promise.allSettled(
    imageUrls.map(({ url, characterName }) =>
      analyzeCharacterImage(url, characterName)
    )
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`[Character Image Analyzer] Failed to analyze image ${index}:`, result.reason)
      return null
    }
  })
}

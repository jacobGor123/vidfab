/**
 * Video Agent - Prompt 字段提取服务
 * 使用 Gemini API 从自定义 prompt 提取结构化字段
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MODEL_NAME } from './processors/script/constants'

// 初始化 Gemini AI client（复用相同配置）
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

const GEMINI_MODEL = MODEL_NAME

/**
 * 从 prompt 提取的结构化字段
 */
export interface ExtractedFields {
  description: string
  camera_angle: string
  character_action: string
  mood: string
  video_prompt?: string  // 用于视频生成的 prompt
}

/**
 * 使用 Gemini Flash 从自定义 prompt 提取结构化字段
 * @param customPrompt 用户自定义的 prompt
 * @param retries 重试次数
 * @returns 提取的结构化字段
 */
export async function extractFieldsFromPrompt(
  customPrompt: string,
  retries = 3
): Promise<ExtractedFields> {
  console.log('[Prompt Field Extractor] Starting extraction', {
    promptLength: customPrompt.length,
    retries
  })

  const systemPrompt = `You are a video storyboard analyzer. Extract structured fields from the given storyboard prompt.

Return a JSON object with these exact fields:
{
  "description": "Main scene description (what is happening) - concise, 1-2 sentences",
  "camera_angle": "Camera angle and framing (e.g., Wide shot, Close-up, Bird's eye view, Medium shot)",
  "character_action": "What characters are doing in the scene - action verbs and movements",
  "mood": "Overall mood and atmosphere (e.g., Peaceful, Tense, Joyful, Mysterious, Dramatic)",
  "video_prompt": "Optimized prompt for video generation - keep all visual details, camera movements, and character actions"
}

Rules:
- Keep each field concise and focused
- If a field is not mentioned in the prompt, use a reasonable default
- The video_prompt should be a refined version of the input that works well for video generation
- Return ONLY the JSON object, no additional text
- All text must be in English

Example:
Input: "A detective in a dark alley examines clues under a flickering streetlight, looking suspicious"
Output:
{
  "description": "A detective examines clues in a dark alley under flickering streetlight",
  "camera_angle": "Medium shot, slightly low angle",
  "character_action": "Examining clues, looking around suspiciously",
  "mood": "Mysterious and tense",
  "video_prompt": "A detective in a dark alley examines clues under a flickering streetlight, looking suspicious, medium shot with slight low angle, mysterious atmosphere"
}`

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 调用 Gemini API
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL
      })

      const result = await model.generateContent([
        `${systemPrompt}\n\nStoryboard prompt: ${customPrompt}`
      ])

      const response = await result.response
      const content = response.text()

      if (!content) {
        throw new Error('Empty response from Gemini API')
      }

      console.log('[Prompt Field Extractor] Received response:', {
        contentLength: content.length,
        attempt: attempt + 1
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
      let extracted: ExtractedFields
      try {
        extracted = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('[Prompt Field Extractor] JSON parse error:', parseError)
        console.error('[Prompt Field Extractor] Raw content:', content)
        throw new Error('Invalid JSON response from Gemini API')
      }

      // 验证必需字段
      if (!extracted.description) {
        throw new Error('Missing description field')
      }

      // 设置默认值
      const extractedResult: ExtractedFields = {
        description: extracted.description,
        camera_angle: extracted.camera_angle || 'Medium shot',
        character_action: extracted.character_action || 'Moving naturally',
        mood: extracted.mood || 'Neutral',
        video_prompt: extracted.video_prompt || customPrompt  // 降级为原始 prompt
      }

      console.log('[Prompt Field Extractor] Extraction completed:', {
        descriptionLength: extractedResult.description.length,
        videoPromptLength: extractedResult.video_prompt?.length
      })

      return extractedResult

    } catch (error: any) {
      console.error(`[Prompt Field Extractor] Attempt ${attempt + 1} failed:`, error)

      if (attempt === retries - 1) {
        // 最后一次尝试失败，返回降级结果
        console.warn('[Prompt Field Extractor] All retries failed, using fallback')
        return {
          description: customPrompt,  // 使用原始 prompt
          camera_angle: 'Medium shot',
          character_action: 'Moving naturally',
          mood: 'Neutral',
          video_prompt: customPrompt
        }
      }

      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  // TypeScript 要求返回值，但实际上不会到达这里
  throw new Error('Unreachable')
}

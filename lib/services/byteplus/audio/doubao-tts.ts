/**
 * Doubao TTS (豆包语音合成) API 封装
 * 使用字节跳动 TTS 服务生成英文旁白
 */

const DOUBAO_TTS_BASE_URL = process.env.DOUBAO_TTS_BASE_URL || 'https://openspeech.bytedance.com/api/v1/tts'
const DOUBAO_TTS_APP_ID = process.env.DOUBAO_TTS_APP_ID || ''
const DOUBAO_TTS_ACCESS_TOKEN = process.env.DOUBAO_TTS_ACCESS_TOKEN || ''

if (!DOUBAO_TTS_APP_ID || !DOUBAO_TTS_ACCESS_TOKEN) {
  console.warn('⚠️ Doubao TTS credentials not configured. Narration feature will not work.')
}

/**
 * Doubao TTS 请求参数
 */
export interface DoubaoTTSRequest {
  text: string                 // 要合成的文本
  voice_type?: string          // 音色（默认：英文女声）
  speed?: number              // 语速（0.5-2.0，默认 1.0）
  volume?: number             // 音量（0-100，默认 50）
  sample_rate?: number        // 采样率（16000/24000，默认 24000）
  format?: 'mp3' | 'wav'      // 输出格式（默认 mp3）
}

/**
 * Doubao TTS 响应
 */
export interface DoubaoTTSResponse {
  success: boolean
  audio_url: string           // 生成的音频文件 URL
  duration?: number           // 音频时长（秒）
  error?: string
}

/**
 * 英文音色列表（推荐用于旁白）
 */
export const ENGLISH_VOICES = {
  // 女声
  'en_us_female_1': 'BV001_streaming',  // 美式英语女声 - 专业、清晰
  'en_us_female_2': 'BV002_streaming',  // 美式英语女声 - 温柔、亲切
  'en_uk_female': 'BV003_streaming',    // 英式英语女声 - 优雅、正式

  // 男声
  'en_us_male_1': 'BV004_streaming',    // 美式英语男声 - 浑厚、专业
  'en_us_male_2': 'BV005_streaming',    // 美式英语男声 - 年轻、活力
  'en_uk_male': 'BV006_streaming'       // 英式英语男声 - 成熟、权威
}

/**
 * 生成旁白音频
 * @param request TTS 请求参数
 * @returns 音频文件 URL 和时长
 */
export async function generateNarration(
  request: DoubaoTTSRequest
): Promise<DoubaoTTSResponse> {
  if (!DOUBAO_TTS_APP_ID || !DOUBAO_TTS_ACCESS_TOKEN) {
    throw new Error('Doubao TTS credentials not configured')
  }

  console.log('[Doubao TTS] Generating narration:', {
    textLength: request.text.length,
    voice: request.voice_type || 'default'
  })

  try {
    const requestBody = {
      app: {
        appid: DOUBAO_TTS_APP_ID,
        token: DOUBAO_TTS_ACCESS_TOKEN,
        cluster: 'volcano_tts'
      },
      user: {
        uid: 'video-agent-user'
      },
      audio: {
        voice_type: request.voice_type || ENGLISH_VOICES.en_us_female_1,
        encoding: request.format || 'mp3',
        speed_ratio: request.speed || 1.0,
        volume_ratio: (request.volume || 50) / 100,
        sample_rate: request.sample_rate || 24000
      },
      request: {
        reqid: `tts_${Date.now()}`,
        text: request.text,
        text_type: 'plain',
        operation: 'query'
      }
    }

    console.log('[Doubao TTS] API request:', {
      url: DOUBAO_TTS_BASE_URL,
      textLength: request.text.length,
      voice: requestBody.audio.voice_type
    })

    const response = await fetch(DOUBAO_TTS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_TTS_ACCESS_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Doubao TTS] API error:', {
        status: response.status,
        error: errorText
      })
      throw new Error(`Doubao TTS API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[Doubao TTS] API response:', JSON.stringify(result, null, 2))

    // 处理响应格式（根据实际 API 响应调整）
    if (result.code !== 0 && result.code !== 3000) {
      throw new Error(`Doubao TTS failed: ${result.message || 'Unknown error'}`)
    }

    // 音频数据通常在 result.data 中
    const audioData = result.data
    if (!audioData) {
      throw new Error('No audio data in response')
    }

    // 如果返回的是 base64，需要上传到存储
    // 如果返回的是 URL，直接使用
    const audioUrl = audioData.audio_url || audioData.url || ''

    if (!audioUrl) {
      throw new Error('No audio URL in response')
    }

    console.log('[Doubao TTS] Narration generated successfully:', {
      audioUrl,
      duration: audioData.duration
    })

    return {
      success: true,
      audio_url: audioUrl,
      duration: audioData.duration
    }

  } catch (error: any) {
    console.error('[Doubao TTS] Generation failed:', error)
    throw error
  }
}

/**
 * 批量生成旁白（用于多个片段）
 * @param texts 文本数组
 * @param options 共享的 TTS 选项
 * @returns 音频 URL 数组
 */
export async function generateNarrationBatch(
  texts: string[],
  options?: Partial<DoubaoTTSRequest>
): Promise<DoubaoTTSResponse[]> {
  console.log('[Doubao TTS] Batch generation:', {
    count: texts.length,
    voice: options?.voice_type || 'default'
  })

  const results: DoubaoTTSResponse[] = []

  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await generateNarration({
        text: texts[i],
        ...options
      })
      results.push(result)

      console.log(`[Doubao TTS] Progress: ${i + 1}/${texts.length}`)
    } catch (error) {
      console.error(`[Doubao TTS] Failed to generate narration ${i + 1}:`, error)
      results.push({
        success: false,
        audio_url: '',
        error: error instanceof Error ? error.message : 'Generation failed'
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log('[Doubao TTS] Batch complete:', {
    total: texts.length,
    success: successCount,
    failed: texts.length - successCount
  })

  return results
}

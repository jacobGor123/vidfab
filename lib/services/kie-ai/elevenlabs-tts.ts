/**
 * Kie.ai ElevenLabs TTS API 封装
 * 使用 ElevenLabs Text-to-Speech Multilingual V2 模型生成英文旁白
 *
 * 文档：https://kie.ai/elevenlabs-tts
 */

const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1/jobs'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

if (!KIE_API_KEY) {
  console.warn('⚠️ KIE_API_KEY is not configured. Narration feature will not work.')
}

/**
 * ElevenLabs 音色选项
 */
export const ELEVENLABS_VOICES = {
  // 女声
  'Rachel': 'Rachel',      // 专业、清晰
  'Aria': 'Aria',          // 温柔、亲切
  'Sarah': 'Sarah',        // 自然、友好
  'Laura': 'Laura',        // 成熟、稳重
  'Charlotte': 'Charlotte', // 优雅、正式
  'Alice': 'Alice',        // 年轻、活力
  'Matilda': 'Matilda',    // 甜美、可爱
  'Jessica': 'Jessica',    // 专业、权威
  'Lily': 'Lily',          // 温暖、亲切

  // 男声
  'Roger': 'Roger',        // 浑厚、专业
  'Callum': 'Callum',      // 成熟、权威
  'Liam': 'Liam',          // 年轻、活力
  'Charlie': 'Charlie',    // 友好、自然
  'George': 'George',      // 稳重、可靠
  'Will': 'Will',          // 清晰、专业
  'Eric': 'Eric',          // 温和、亲切
  'Chris': 'Chris',        // 活泼、生动
  'Brian': 'Brian',        // 沉稳、大气
  'Daniel': 'Daniel',      // 自信、有力
  'Bill': 'Bill',          // 成熟、睿智
  'River': 'River'         // 独特、个性
} as const

/**
 * TTS 请求参数
 */
export interface ElevenLabsTTSRequest {
  text: string                    // 要合成的文本（最多 5000 字符）
  voice?: keyof typeof ELEVENLABS_VOICES  // 音色（默认 Rachel）
  stability?: number              // 稳定性 0-1（默认 0.5）
  similarity_boost?: number       // 相似度增强 0-1（默认 0.75）
  style?: number                  // 风格夸张度 0-1（默认 0）
  speed?: number                  // 语速 0.7-1.2（默认 1.0）
  timestamps?: boolean            // 是否返回时间戳（默认 false）
  previous_text?: string          // 前文（用于提升连贯性）
  next_text?: string              // 后文（用于提升连贯性）
}

/**
 * TTS 任务创建响应
 */
interface CreateTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

/**
 * TTS 任务状态响应
 */
interface TaskStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'success' | 'fail'
    param: string
    resultJson: string  // JSON string: { resultUrls: string[] } 或 { resultObject: any }
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

/**
 * TTS 生成响应
 */
export interface ElevenLabsTTSResponse {
  success: boolean
  audio_url: string     // 生成的音频文件 URL
  duration?: number     // 音频时长（秒）
  error?: string
}

/**
 * 创建 TTS 任务
 */
async function createTTSTask(request: ElevenLabsTTSRequest): Promise<string> {
  console.log('[Kie.ai TTS] Creating task:', {
    textLength: request.text.length,
    voice: request.voice || 'Rachel'
  })

  const response = await fetch(`${KIE_API_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'elevenlabs/text-to-speech-multilingual-v2',
      input: {
        text: request.text,
        voice: request.voice || 'Rachel',
        stability: request.stability ?? 0.5,
        similarity_boost: request.similarity_boost ?? 0.75,
        style: request.style ?? 0,
        speed: request.speed ?? 1.0,
        timestamps: request.timestamps ?? false,
        previous_text: request.previous_text || '',
        next_text: request.next_text || '',
        language_code: ''  // 留空，自动检测
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Kie.ai TTS] API error:', {
      status: response.status,
      error: errorText
    })
    throw new Error(`Kie.ai TTS API error: ${response.status} - ${errorText}`)
  }

  const result: CreateTaskResponse = await response.json()

  if (result.code !== 200) {
    throw new Error(`Kie.ai TTS failed: ${result.msg}`)
  }

  console.log('[Kie.ai TTS] Task created:', result.data.taskId)
  return result.data.taskId
}

/**
 * 查询 TTS 任务状态
 */
async function getTTSTaskStatus(taskId: string): Promise<TaskStatusResponse['data']> {
  const response = await fetch(
    `${KIE_API_BASE_URL}/recordInfo?taskId=${taskId}`,
    {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get task status: ${response.status} - ${errorText}`)
  }

  const result: TaskStatusResponse = await response.json()

  if (result.code !== 200) {
    throw new Error(`Failed to query task: ${result.msg}`)
  }

  return result.data
}

/**
 * 轮询等待任务完成
 */
async function pollTaskCompletion(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<TaskStatusResponse['data']> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTTSTaskStatus(taskId)

    if (status.state === 'success') {
      console.log('[Kie.ai TTS] Task completed:', taskId)
      return status
    }

    if (status.state === 'fail') {
      throw new Error(`TTS generation failed: ${status.failMsg || 'Unknown error'}`)
    }

    // 还在等待中，继续轮询
    console.log(`[Kie.ai TTS] Task ${taskId} still processing... (${i + 1}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`TTS generation timeout after ${maxAttempts * intervalMs / 1000}s`)
}

/**
 * 生成旁白音频（完整流程）
 * @param request TTS 请求参数
 * @returns 音频文件 URL
 */
export async function generateNarration(
  request: ElevenLabsTTSRequest
): Promise<ElevenLabsTTSResponse> {
  if (!KIE_API_KEY) {
    throw new Error('KIE_API_KEY not configured')
  }

  try {
    // 1. 创建任务
    const taskId = await createTTSTask(request)

    // 2. 轮询等待完成
    const result = await pollTaskCompletion(taskId)

    // 3. 解析结果
    if (!result.resultJson) {
      throw new Error('No result in response')
    }

    const resultData = JSON.parse(result.resultJson)

    // 根据文档，音频 URL 在 resultUrls 数组中
    const audioUrl = resultData.resultUrls?.[0] || resultData.resultObject?.url

    if (!audioUrl) {
      console.error('[Kie.ai TTS] Invalid result structure:', resultData)
      throw new Error('No audio URL in result')
    }

    console.log('[Kie.ai TTS] Narration generated successfully:', {
      audioUrl,
      costTime: result.costTime
    })

    return {
      success: true,
      audio_url: audioUrl,
      duration: result.costTime ? result.costTime / 1000 : undefined
    }

  } catch (error: any) {
    console.error('[Kie.ai TTS] Generation failed:', error)
    return {
      success: false,
      audio_url: '',
      error: error.message || 'Generation failed'
    }
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
  options?: Partial<ElevenLabsTTSRequest>
): Promise<ElevenLabsTTSResponse[]> {
  console.log('[Kie.ai TTS] Batch generation:', {
    count: texts.length,
    voice: options?.voice || 'Rachel'
  })

  const results: ElevenLabsTTSResponse[] = []

  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await generateNarration({
        text: texts[i],
        ...options
      })
      results.push(result)

      console.log(`[Kie.ai TTS] Progress: ${i + 1}/${texts.length}`)
    } catch (error) {
      console.error(`[Kie.ai TTS] Failed to generate narration ${i + 1}:`, error)
      results.push({
        success: false,
        audio_url: '',
        error: error instanceof Error ? error.message : 'Generation failed'
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log('[Kie.ai TTS] Batch complete:', {
    total: texts.length,
    success: successCount,
    failed: texts.length - successCount
  })

  return results
}

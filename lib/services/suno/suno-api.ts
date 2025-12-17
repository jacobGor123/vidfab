/**
 * Suno AI Music Generation API
 * 音乐生成服务
 */

export interface SunoGenerateRequest {
  prompt: string
  make_instrumental?: boolean
  wait_audio?: boolean
}

export interface SunoGenerateResponse {
  id: string
  status: string
  audio_url?: string
  video_url?: string
  image_url?: string
  lyric?: string
  title?: string
  model_name?: string
  created_at?: string
}

export interface SunoStatusResponse {
  id: string
  status: 'submitted' | 'processing' | 'completed' | 'failed'
  audio_url?: string
  video_url?: string
  image_url?: string
  lyric?: string
  title?: string
  error_message?: string
}

export class SunoAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'SunoAPIError'
  }
}

export class SunoAPI {
  private baseURL: string
  private apiKey: string

  constructor() {
    // 使用 KIE API 而不是官方 Suno API
    this.baseURL = process.env.KIE_API_BASE_URL || 'https://api.kie.ai/api/v1'
    this.apiKey = process.env.KIE_API_KEY || ''

    if (!this.apiKey) {
      console.warn('[Suno API] Warning: KIE_API_KEY not configured')
    }
  }

  /**
   * 生成音乐 (使用 KIE API)
   */
  async generate(request: SunoGenerateRequest): Promise<SunoGenerateResponse> {
    if (!this.apiKey) {
      throw new SunoAPIError('KIE API key not configured')
    }

    try {
      console.log('[Suno API] Generating music via KIE:', {
        promptLength: request.prompt.length,
        instrumental: request.make_instrumental
      })

      // 构建回调URL（用于接收KIE的生成完成通知）
      const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie/music`
        : 'https://vidfab.ai/api/webhooks/kie/music'

      const response = await fetch(`${this.baseURL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt: request.prompt,
          instrumental: request.make_instrumental ?? false,
          model: 'V4',
          customMode: true,
          callBackUrl: callbackUrl
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SunoAPIError(
          errorData.msg || errorData.message || `KIE API request failed: ${response.status}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()

      // KIE API 响应格式: {code: 200, msg: "success", data: {taskId: "xxx"}}
      if (data.code !== 200) {
        throw new SunoAPIError(
          data.msg || 'KIE API request failed',
          data.code,
          data
        )
      }

      if (!data.data?.taskId) {
        throw new SunoAPIError('No taskId returned from KIE API')
      }

      console.log('[Suno API] Generation started:', {
        taskId: data.data.taskId
      })

      return {
        id: data.data.taskId,
        status: 'submitted'
      }
    } catch (error) {
      if (error instanceof SunoAPIError) {
        throw error
      }

      console.error('[Suno API] Generation error:', error)
      throw new SunoAPIError(
        `Failed to generate music: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 查询音乐生成状态 (使用 KIE API)
   */
  async getStatus(id: string): Promise<SunoStatusResponse> {
    if (!this.apiKey) {
      throw new SunoAPIError('KIE API key not configured')
    }

    try {
      const response = await fetch(`${this.baseURL}/generate/record-info?taskId=${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SunoAPIError(
          errorData.msg || errorData.message || `Failed to get status: ${response.status}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()

      // KIE API 响应格式检查
      if (data.code !== 200) {
        throw new SunoAPIError(
          data.msg || 'Failed to get status',
          data.code,
          data
        )
      }

      if (!data.data) {
        throw new SunoAPIError('No data returned from KIE API')
      }

      const taskData = data.data
      const sunoData = taskData.response?.sunoData?.[0]

      // 记录原始响应数据用于调试
      console.log('[Suno API] KIE raw status response:', {
        taskId: id,
        kieStatus: taskData.status,
        hasErrorCode: !!taskData.errorCode,
        errorCode: taskData.errorCode,
        hasSunoData: !!sunoData,
        hasAudioUrl: !!sunoData?.audioUrl,
        audioUrl: sunoData?.audioUrl
      })

      // 映射KIE的状态到标准状态
      let status: 'submitted' | 'processing' | 'completed' | 'failed'
      if (taskData.status === 'SUCCESS') {
        status = 'completed'
      } else if (taskData.status === 'FAILED' || taskData.errorCode) {
        status = 'failed'
      } else if (taskData.status === 'PROCESSING' || taskData.status === 'TEXT_SUCCESS') {
        // TEXT_SUCCESS 表示文本生成完成，音频还在生成中
        status = 'processing'
      } else {
        status = 'submitted'
      }

      console.log('[Suno API] Status mapped:', {
        taskId: id,
        kieStatus: taskData.status,
        mappedStatus: status
      })

      return {
        id: taskData.taskId,
        status,
        audio_url: sunoData?.audioUrl,
        video_url: sunoData?.streamAudioUrl,
        image_url: sunoData?.imageUrl,
        lyric: sunoData?.prompt,
        title: sunoData?.title,
        error_message: taskData.errorMessage
      }
    } catch (error) {
      if (error instanceof SunoAPIError) {
        throw error
      }

      console.error('[Suno API] Status check error:', error)
      throw new SunoAPIError(
        `Failed to check status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 映射 Suno API 状态到标准状态
   */
  private mapStatus(sunoStatus: string): 'submitted' | 'processing' | 'completed' | 'failed' {
    switch (sunoStatus) {
      case 'submitted':
      case 'queued':
        return 'submitted'
      case 'streaming':
      case 'processing':
        return 'processing'
      case 'complete':
      case 'success':
        return 'completed'
      case 'error':
      case 'failed':
        return 'failed'
      default:
        return 'processing'
    }
  }

  /**
   * 轮询等待音乐生成完成
   */
  async waitForCompletion(
    id: string,
    options: {
      maxAttempts?: number
      intervalMs?: number
      onProgress?: (status: SunoStatusResponse) => void
    } = {}
  ): Promise<SunoStatusResponse> {
    const {
      maxAttempts = 60, // 最多 60 次
      intervalMs = 5000, // 每 5 秒查询一次
      onProgress
    } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getStatus(id)

      if (onProgress) {
        onProgress(status)
      }

      if (status.status === 'completed') {
        console.log('[Suno API] Music generation completed:', {
          id,
          audioUrl: status.audio_url
        })
        return status
      }

      if (status.status === 'failed') {
        throw new SunoAPIError(
          `Music generation failed: ${status.error_message || 'Unknown error'}`
        )
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new SunoAPIError('Music generation timeout')
  }
}

// 单例实例
export const sunoAPI = new SunoAPI()

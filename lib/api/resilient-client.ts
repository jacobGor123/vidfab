/**
 * Resilient API Client with Enhanced Error Handling
 * VidFab AI Video Platform
 */

import {
  resilientFetch,
  retryWithBackoff,
  CircuitBreaker,
  RetryableError,
  NonRetryableError,
  classifyError,
  ErrorReporter
} from '@/lib/utils/error-handling'

export interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  enableCircuitBreaker?: boolean
  headers?: Record<string, string>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode: number
}

export class ResilientApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private timeout: number
  private maxRetries: number
  private circuitBreakers: Map<string, CircuitBreaker>
  private errorReporter: ErrorReporter

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.timeout = options.timeout || 30000
    this.maxRetries = options.maxRetries || 3
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    this.circuitBreakers = new Map()
    this.errorReporter = ErrorReporter.getInstance()
  }

  private getCircuitBreaker(endpoint: string): CircuitBreaker {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, new CircuitBreaker({
        failureThreshold: 3,
        timeoutMs: this.timeout,
        monitoringPeriodMs: 60000,
        recoverAfterMs: 30000
      }))
    }
    return this.circuitBreakers.get(endpoint)!
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const circuitBreaker = this.getCircuitBreaker(endpoint)

    try {
      const response = await circuitBreaker.execute(async () => {
        return await resilientFetch(
          url,
          {
            ...options,
            headers: {
              ...this.defaultHeaders,
              ...options.headers
            }
          },
          {
            maxAttempts: this.maxRetries,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            onRetry: (attempt, error) => {
              this.errorReporter.reportError(error, `API ${endpoint} - Retry ${attempt}`)
            }
          }
        )
      })

      let data: T
      try {
        data = await response.json()
      } catch (parseError) {
        // If response is not JSON, try to get text
        const text = await response.text()
        data = text as unknown as T
      }

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : (data as any)?.error || `HTTP ${response.status}`,
        statusCode: response.status
      }

    } catch (error) {
      const errorInfo = classifyError(error)
      this.errorReporter.reportError(error, `API ${endpoint}`)

      return {
        success: false,
        error: errorInfo.userMessage,
        statusCode: (error as any)?.status || 0
      }
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'GET'
    })
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'DELETE'
    })
  }

  // Health check methods
  getCircuitBreakerStatus() {
    const status: Record<string, any> = {}
    for (const [endpoint, cb] of this.circuitBreakers) {
      status[endpoint] = cb.getState()
    }
    return status
  }

  resetCircuitBreakers() {
    this.circuitBreakers.clear()
  }
}

// Global API client instance
export const apiClient = new ResilientApiClient()

// Video-specific API methods
export class VideoApiClient extends ResilientApiClient {
  constructor() {
    super({
      timeout: 60000, // Longer timeout for video operations
      maxRetries: 5
    })
  }

  async generateVideo(requestData: any): Promise<ApiResponse<any>> {
    return this.post('/api/video/generate', requestData)
  }

  async getVideoStatus(requestId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/video/status/${requestId}`)
  }

  async storeVideo(storeData: any): Promise<ApiResponse<any>> {
    return this.post('/api/video/store', storeData)
  }

  async getStorageProgress(videoId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/video/store?videoId=${videoId}`)
  }

  async getUserVideos(params: any = {}): Promise<ApiResponse<any>> {
    const query = new URLSearchParams(params).toString()
    return this.get(`/api/video/user${query ? `?${query}` : ''}`)
  }

  async deleteVideo(videoId: string): Promise<ApiResponse<any>> {
    return this.delete(`/api/video/${videoId}`)
  }

  async toggleFavorite(videoId: string): Promise<ApiResponse<any>> {
    return this.post(`/api/video/${videoId}/favorite`)
  }

  async recordView(videoId: string): Promise<ApiResponse<any>> {
    return this.post(`/api/video/${videoId}/view`)
  }
}

export const videoApiClient = new VideoApiClient()

// Wavespeed API client with custom error handling
export class WavespeedApiClient extends ResilientApiClient {
  constructor(apiKey: string) {
    super({
      baseUrl: 'https://api.runwayml.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000, // 2 minutes for Wavespeed
      maxRetries: 3
    })
  }

  async createVideoGeneration(params: any): Promise<ApiResponse<any>> {
    return retryWithBackoff(
      async () => this.post('/image_to_video', params),
      {
        maxAttempts: 3,
        baseDelayMs: 5000, // Start with 5 second delay for external API
        maxDelayMs: 60000,
        retryCondition: (error) => {
          // More conservative retry for external API
          return error?.statusCode >= 500 ||
                 error?.statusCode === 429 ||
                 error?.message?.includes('timeout') ||
                 error?.message?.includes('network')
        },
        onRetry: (attempt, error) => {
          console.warn(`Wavespeed API retry ${attempt}:`, error)
        }
      }
    )
  }

  async getTaskStatus(taskId: string): Promise<ApiResponse<any>> {
    return this.get(`/tasks/${taskId}`)
  }
}

// Error boundary for API operations
export async function withApiErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = 'API Operation',
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const errorInfo = classifyError(error)
    const errorReporter = ErrorReporter.getInstance()

    errorReporter.reportError(error, context)

    // If it's a non-retryable error or no fallback available, throw
    if (!errorInfo.isRetryable || !fallback) {
      throw new Error(errorInfo.userMessage)
    }

    // Try fallback if available
    try {
      console.warn(`${context} failed, trying fallback:`, errorInfo.userMessage)
      return await fallback()
    } catch (fallbackError) {
      errorReporter.reportError(fallbackError, `${context} - Fallback`)
      throw new Error(errorInfo.userMessage)
    }
  }
}
import { BytePlusAPIError } from './errors'
import { retryWithBackoff } from './retry'

interface BytePlusClientOptions {
  baseUrl?: string
  apiKey?: string
  timeoutMs?: number
  enableRetry?: boolean
  maxRetries?: number
}

const DEFAULT_BASE_URL = process.env.BYTEPLUS_ARK_BASE_URL || 'https://ark.ap-southeast.bytepluses.com/api/v3'
const DEFAULT_TIMEOUT_MS = 15000

export class BytePlusClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number
  private enableRetry: boolean
  private maxRetries: number

  constructor(options: BytePlusClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL
    this.apiKey = options.apiKey || process.env.BYTEPLUS_ARK_API_KEY
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
    this.enableRetry = options.enableRetry ?? true
    this.maxRetries = options.maxRetries ?? 3

    if (!this.apiKey) {
      console.warn('⚠️ BYTEPLUS_ARK_API_KEY is not configured in environment variables')
    }
  }

  async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const exec = async (): Promise<T> => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw await this.handleError(response)
        }

        // Some endpoints might return empty body
        const text = await response.text()
        if (!text) return undefined as unknown as T

        try {
          return JSON.parse(text) as T
        } catch (parseError) {
          throw new BytePlusAPIError('Failed to parse JSON response', response.status, 'INVALID_JSON')
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new BytePlusAPIError('Request timed out', 408, 'TIMEOUT')
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }
    }

    if (this.enableRetry) {
      return retryWithBackoff(exec, this.maxRetries)
    }

    return exec()
  }

  private async handleError(response: Response): Promise<BytePlusAPIError> {
    const status = response.status
    let message = `HTTP ${status}: ${response.statusText}`
    let code: string | undefined
    let details: unknown

    try {
      const bodyText = await response.text()
      if (bodyText) {
        try {
          const data = JSON.parse(bodyText)
          message = data.error?.message || data.message || message
          code = data.error?.code || data.code
          details = data
        } catch {
          message = bodyText
        }
      }
    } catch {
      // ignore body read errors
    }

    return new BytePlusAPIError(message, status, code, details)
  }
}

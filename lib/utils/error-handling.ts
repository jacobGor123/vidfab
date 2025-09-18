/**
 * Enhanced Error Handling and Retry Mechanisms
 * VidFab AI Video Platform
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterMs: number
  retryCondition: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  timeoutMs: number
  monitoringPeriodMs: number
  recoverAfterMs: number
}

export class RetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'RetryableError'
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

/**
 * Enhanced retry utility with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100,
    retryCondition: (error) => !(error instanceof NonRetryableError),
    ...options
  }

  let lastError: any

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation()
      return result
    } catch (error) {
      lastError = error

      // Don't retry on the last attempt or if error is not retryable
      if (attempt === config.maxAttempts || !config.retryCondition(error)) {
        break
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      )
      const jitter = Math.random() * config.jitterMs
      const totalDelay = exponentialDelay + jitter

      console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${Math.round(totalDelay)}ms:`, error)

      config.onRetry?.(attempt, error)

      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  throw lastError
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private nextAttemptTime = 0

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new NonRetryableError('Circuit breaker is OPEN')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.options.timeoutMs)
        )
      ])

      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttemptTime = Date.now() + this.options.recoverAfterMs
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime
    }
  }
}

/**
 * HTTP request with retry and circuit breaker
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      // Check if response indicates a retryable error
      if (response.status >= 500 || response.status === 429) {
        throw new RetryableError(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.ok) {
        throw new NonRetryableError(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      retryCondition: (error) =>
        error instanceof RetryableError ||
        error.name === 'TypeError' || // Network errors
        error.name === 'TimeoutError',
      onRetry: (attempt, error) => {
        console.warn(`Fetch retry ${attempt} for ${url}:`, error.message)
      },
      ...retryOptions
    }
  )
}

/**
 * Database operation wrapper with retry logic
 */
export async function resilientDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  return retryWithBackoff(
    operation,
    {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      retryCondition: (error) => {
        // Retry on connection issues, timeouts, and temporary failures
        const retryableErrors = [
          'PGRST301', // Connection timeout
          'PGRST302', // Connection refused
          '08001',    // SQL connection error
          '08006',    // Connection failure
          '53300',    // Too many connections
          '40001',    // Serialization failure
        ]

        return retryableErrors.some(code =>
          error?.code === code ||
          error?.message?.includes(code) ||
          error?.message?.includes('connection') ||
          error?.message?.includes('timeout')
        )
      },
      onRetry: (attempt, error) => {
        console.warn(`${operationName} retry ${attempt}:`, error.message)
      }
    }
  )
}

/**
 * Storage operation wrapper with retry logic
 */
export async function resilientStorageOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Storage operation'
): Promise<T> {
  return retryWithBackoff(
    operation,
    {
      maxAttempts: 5,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      retryCondition: (error) => {
        // Retry on network errors, rate limits, and temporary storage issues
        return (
          error?.name === 'TypeError' || // Network errors
          error?.status === 429 ||       // Rate limited
          error?.status === 500 ||       // Server errors
          error?.status === 502 ||       // Bad gateway
          error?.status === 503 ||       // Service unavailable
          error?.status === 504 ||       // Gateway timeout
          error?.message?.includes('network') ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('connection')
        )
      },
      onRetry: (attempt, error) => {
        console.warn(`${operationName} retry ${attempt}:`, error.message)
      }
    }
  )
}

/**
 * Error classification utility
 */
export function classifyError(error: any): {
  type: 'network' | 'auth' | 'validation' | 'server' | 'storage' | 'unknown'
  isRetryable: boolean
  userMessage: string
} {
  // Network errors
  if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
    return {
      type: 'network',
      isRetryable: true,
      userMessage: 'Network connection error. Please check your internet connection and try again.'
    }
  }

  // Authentication errors
  if (error?.status === 401 || error?.message?.includes('unauthorized')) {
    return {
      type: 'auth',
      isRetryable: false,
      userMessage: 'Authentication failed. Please log in again.'
    }
  }

  // Validation errors
  if (error?.status === 400 || error?.status === 422) {
    return {
      type: 'validation',
      isRetryable: false,
      userMessage: 'Invalid request. Please check your input and try again.'
    }
  }

  // Server errors
  if (error?.status >= 500) {
    return {
      type: 'server',
      isRetryable: true,
      userMessage: 'Server error. We\'re working to fix this. Please try again later.'
    }
  }

  // Storage errors
  if (error?.message?.includes('storage') || error?.message?.includes('upload')) {
    return {
      type: 'storage',
      isRetryable: true,
      userMessage: 'Storage operation failed. Please try again.'
    }
  }

  return {
    type: 'unknown',
    isRetryable: true,
    userMessage: 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Global error handler for consistent error reporting
 */
export class ErrorReporter {
  private static instance: ErrorReporter
  private errorQueue: Array<{ error: any; context: string; timestamp: number }> = []

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter()
    }
    return ErrorReporter.instance
  }

  reportError(error: any, context: string = 'Unknown') {
    const errorEntry = {
      error,
      context,
      timestamp: Date.now()
    }

    this.errorQueue.push(errorEntry)

    // Keep only recent errors (last 100)
    if (this.errorQueue.length > 100) {
      this.errorQueue = this.errorQueue.slice(-100)
    }

    // Log error
    console.error(`[${context}]`, error)

    // In production, you might want to send to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(errorEntry)
    }
  }

  private async sendToErrorTracking(errorEntry: any) {
    // Implementation for error tracking service (Sentry, etc.)
    // This is a placeholder
    console.log('Would send to error tracking:', errorEntry)
  }

  getRecentErrors(limit: number = 10) {
    return this.errorQueue.slice(-limit)
  }

  clearErrors() {
    this.errorQueue = []
  }
}

/**
 * Graceful degradation utility
 */
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  fallbackCondition: (error: any) => boolean = () => true
): Promise<T> {
  try {
    return await primaryOperation()
  } catch (error) {
    if (fallbackCondition(error)) {
      console.warn('Primary operation failed, using fallback:', error.message)
      return await fallbackOperation()
    }
    throw error
  }
}
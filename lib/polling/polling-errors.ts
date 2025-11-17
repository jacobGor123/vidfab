/**
 * Unified Polling Error Handling System
 * Provides type-safe error classification, error messages, and recovery strategies
 */

/**
 * Polling error types
 */
export enum PollingErrorType {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  REQUEST_ABORTED = 'REQUEST_ABORTED',

  // API errors
  API_ERROR = 'API_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',

  // Task errors
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  TASK_FAILED = 'TASK_FAILED',
  MAX_ERRORS_REACHED = 'MAX_ERRORS_REACHED',

  // Resource errors
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Storage errors
  STORAGE_FAILED = 'STORAGE_FAILED',
  STORAGE_TIMEOUT = 'STORAGE_TIMEOUT',

  // Config errors
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Polling error class
 */
export class PollingError extends Error {
  public readonly type: PollingErrorType
  public readonly originalError?: Error
  public readonly context?: Record<string, any>
  public readonly timestamp: number
  public readonly recoverable: boolean

  constructor(
    type: PollingErrorType,
    message: string,
    options?: {
      originalError?: Error
      context?: Record<string, any>
      recoverable?: boolean
    }
  ) {
    super(message)
    this.name = 'PollingError'
    this.type = type
    this.originalError = options?.originalError
    this.context = options?.context
    this.timestamp = Date.now()
    this.recoverable = options?.recoverable ?? true

    // Maintain correct prototype chain
    Object.setPrototypeOf(this, PollingError.prototype)
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return getErrorMessage(this.type, this.message)
  }

  /**
   * Check if should retry
   */
  shouldRetry(): boolean {
    return this.recoverable && ![
      PollingErrorType.TASK_NOT_FOUND,
      PollingErrorType.INVALID_CONFIG,
      PollingErrorType.MAX_ERRORS_REACHED
    ].includes(this.type)
  }

  /**
   * Convert to JSON (for logging)
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.getUserMessage(),
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack
    }
  }
}

/**
 * Error message mapping (English)
 */
const ERROR_MESSAGES: Record<PollingErrorType, string> = {
  // Network errors
  [PollingErrorType.NETWORK_ERROR]: 'Network connection failed. Please check your connection and try again.',
  [PollingErrorType.REQUEST_TIMEOUT]: 'Request timeout. Please try again.',
  [PollingErrorType.REQUEST_ABORTED]: 'Request was cancelled.',

  // API errors
  [PollingErrorType.API_ERROR]: 'API service error. Please try again later.',
  [PollingErrorType.INVALID_RESPONSE]: 'Invalid server response.',
  [PollingErrorType.TASK_NOT_FOUND]: 'Task not found or expired.',

  // Task errors
  [PollingErrorType.TASK_TIMEOUT]: 'Task processing timeout. Please regenerate.',
  [PollingErrorType.TASK_FAILED]: 'Task processing failed. Please try again.',
  [PollingErrorType.MAX_ERRORS_REACHED]: 'Too many errors. Polling stopped.',

  // Resource errors
  [PollingErrorType.INSUFFICIENT_CREDITS]: 'Insufficient credits. Please upgrade your plan.',
  [PollingErrorType.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',

  // Storage errors
  [PollingErrorType.STORAGE_FAILED]: 'Failed to save, but task completed.',
  [PollingErrorType.STORAGE_TIMEOUT]: 'Save timeout. Please refresh to check.',

  // Config errors
  [PollingErrorType.INVALID_CONFIG]: 'Configuration error. Please contact support.',

  // Unknown errors
  [PollingErrorType.UNKNOWN_ERROR]: 'Unknown error. Please try again or contact support.'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(
  type: PollingErrorType,
  fallback?: string
): string {
  return ERROR_MESSAGES[type] || fallback || ERROR_MESSAGES[PollingErrorType.UNKNOWN_ERROR]
}

/**
 * Create PollingError from raw error
 */
export function createPollingError(
  error: unknown,
  context?: Record<string, any>
): PollingError {
  // Already a PollingError
  if (error instanceof PollingError) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    // Determine type based on error characteristics
    if (error.name === 'AbortError') {
      return new PollingError(
        PollingErrorType.REQUEST_ABORTED,
        'Request cancelled',
        { originalError: error, context }
      )
    }

    if (error.message.includes('timeout')) {
      return new PollingError(
        PollingErrorType.REQUEST_TIMEOUT,
        'Request timeout',
        { originalError: error, context }
      )
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new PollingError(
        PollingErrorType.NETWORK_ERROR,
        'Network error',
        { originalError: error, context }
      )
    }

    return new PollingError(
      PollingErrorType.UNKNOWN_ERROR,
      error.message,
      { originalError: error, context }
    )
  }

  // Other error types
  return new PollingError(
    PollingErrorType.UNKNOWN_ERROR,
    String(error),
    { context }
  )
}

/**
 * Convert HTTP status code to PollingErrorType
 */
export function httpStatusToErrorType(status: number): PollingErrorType {
  if (status === 404) {
    return PollingErrorType.TASK_NOT_FOUND
  }
  if (status === 429) {
    return PollingErrorType.RATE_LIMIT_EXCEEDED
  }
  if (status === 402 || status === 403) {
    return PollingErrorType.INSUFFICIENT_CREDITS
  }
  if (status >= 500) {
    return PollingErrorType.API_ERROR
  }
  return PollingErrorType.API_ERROR
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Should retry */
  shouldRetry: boolean
  /** Retry delay (milliseconds) */
  retryDelay: number
  /** Should notify user */
  shouldNotify: boolean
  /** Should stop polling */
  shouldStopPolling: boolean
}

/**
 * Get error recovery strategy
 */
export function getRecoveryStrategy(
  error: PollingError,
  retryCount: number,
  maxRetries: number
): ErrorRecoveryStrategy {
  // Max retries reached
  if (retryCount >= maxRetries) {
    return {
      shouldRetry: false,
      retryDelay: 0,
      shouldNotify: true,
      shouldStopPolling: true
    }
  }

  // Unrecoverable error
  if (!error.recoverable) {
    return {
      shouldRetry: false,
      retryDelay: 0,
      shouldNotify: true,
      shouldStopPolling: true
    }
  }

  // Strategy based on error type
  switch (error.type) {
    case PollingErrorType.NETWORK_ERROR:
    case PollingErrorType.REQUEST_TIMEOUT:
      // Network error: exponential backoff retry
      return {
        shouldRetry: true,
        retryDelay: Math.min(1000 * Math.pow(2, retryCount), 30000),
        shouldNotify: retryCount >= 2, // Notify after 2 retries
        shouldStopPolling: false
      }

    case PollingErrorType.RATE_LIMIT_EXCEEDED:
      // Rate limit: longer delay before retry
      return {
        shouldRetry: true,
        retryDelay: 10000, // 10 seconds
        shouldNotify: true,
        shouldStopPolling: false
      }

    case PollingErrorType.API_ERROR:
      // API error: short delay retry
      return {
        shouldRetry: true,
        retryDelay: 3000,
        shouldNotify: retryCount >= 1,
        shouldStopPolling: false
      }

    case PollingErrorType.TASK_NOT_FOUND:
    case PollingErrorType.TASK_TIMEOUT:
    case PollingErrorType.MAX_ERRORS_REACHED:
      // Task-related errors: no retry, stop polling
      return {
        shouldRetry: false,
        retryDelay: 0,
        shouldNotify: true,
        shouldStopPolling: true
      }

    case PollingErrorType.STORAGE_FAILED:
    case PollingErrorType.STORAGE_TIMEOUT:
      // Storage errors: retry but don't stop polling
      return {
        shouldRetry: true,
        retryDelay: 2000,
        shouldNotify: retryCount >= 2,
        shouldStopPolling: false
      }

    default:
      // Default strategy
      return {
        shouldRetry: true,
        retryDelay: 3000,
        shouldNotify: retryCount >= 1,
        shouldStopPolling: false
      }
  }
}

/**
 * Error logging
 */
export class PollingErrorLogger {
  private static instance: PollingErrorLogger
  private errors: PollingError[] = []
  private maxErrors = 100

  static getInstance(): PollingErrorLogger {
    if (!PollingErrorLogger.instance) {
      PollingErrorLogger.instance = new PollingErrorLogger()
    }
    return PollingErrorLogger.instance
  }

  /**
   * Log error
   */
  log(error: PollingError): void {
    this.errors.push(error)

    // Limit error count
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    // Console output
    console.error('[PollingError]', {
      type: error.type,
      message: error.message,
      userMessage: error.getUserMessage(),
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    })
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10): PollingError[] {
    return this.errors.slice(-count)
  }

  /**
   * Get error statistics by type
   */
  getErrorStats(): Record<PollingErrorType, number> {
    const stats: Partial<Record<PollingErrorType, number>> = {}

    this.errors.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1
    })

    return stats as Record<PollingErrorType, number>
  }

  /**
   * Clear error log
   */
  clear(): void {
    this.errors = []
  }
}

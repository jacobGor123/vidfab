/**
 * Unified Logger for VidFab AI Video Platform
 * Uses Axiom for cloud logging and console for local development
 */

import { log as axiomLog } from 'next-axiom'

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Structured logger with Axiom integration
 */
export const logger = {
  /**
   * Info level logging
   */
  info: (message: string, data?: Record<string, any>) => {
    console.log(`ℹ️  ${message}`, data || '')
    if (isProduction) {
      axiomLog.info(message, data || {})
    }
  },

  /**
   * Error level logging
   */
  error: (
    message: string,
    error?: Error | unknown,
    data?: Record<string, any>
  ) => {
    console.error(`❌ ${message}`, error)
    if (isProduction) {
      axiomLog.error(message, {
        ...data,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
      })
    }
  },

  /**
   * Warning level logging
   */
  warn: (message: string, data?: Record<string, any>) => {
    console.warn(`⚠️  ${message}`, data || '')
    if (isProduction) {
      axiomLog.warn(message, data || {})
    }
  },

  /**
   * Debug level logging (only in development)
   */
  debug: (message: string, data?: Record<string, any>) => {
    if (!isProduction) {
      console.debug(`🔍 ${message}`, data || '')
    }
  },

  /**
   * Video generation event
   */
  videoGenerated: (data: {
    videoId: string
    userId: string
    duration?: number
    type: 'text-to-video' | 'image-to-video'
    provider: 'wavespeed' | 'byteplus'
  }) => {
    const message = `Video generated: ${data.type}`
    console.log(`🎬 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'video.generated',
        ...data,
      })
    }
  },

  /**
   * Video download event
   */
  videoDownloaded: (data: {
    videoId: string
    userId: string
    fileSize: number
    duration: number
  }) => {
    const message = 'Video downloaded successfully'
    console.log(`⬇️  ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'video.downloaded',
        ...data,
      })
    }
  },

  /**
   * Thumbnail generated event
   */
  thumbnailGenerated: (data: {
    videoId: string
    userId: string
    thumbnailUrl: string
  }) => {
    const message = 'Thumbnail generated'
    console.log(`🖼️  ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'thumbnail.generated',
        ...data,
      })
    }
  },

  /**
   * Payment success event
   */
  paymentSuccess: (data: {
    userId: string
    amount: number
    currency: string
    plan: string
    orderId: string
  }) => {
    const message = `Payment successful: ${data.plan}`
    console.log(`💰 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'payment.success',
        ...data,
      })
    }
  },

  /**
   * Payment failed event
   */
  paymentFailed: (data: {
    userId?: string
    amount: number
    reason: string
    orderId: string
  }) => {
    const message = `Payment failed: ${data.reason}`
    console.error(`❌ ${message}`, data)
    if (isProduction) {
      axiomLog.error(message, {
        event: 'payment.failed',
        ...data,
      })
    }
  },

  /**
   * User registration event
   */
  userRegistered: (data: { userId: string; email: string; provider: string }) => {
    const message = `New user registered via ${data.provider}`
    console.log(`👤 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'user.registered',
        ...data,
      })
    }
  },

  /**
   * User login event
   */
  userLogin: (data: { userId: string; email: string; provider: string }) => {
    const message = `User logged in via ${data.provider}`
    console.log(`🔐 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'user.login',
        ...data,
      })
    }
  },

  /**
   * API request logging
   */
  apiRequest: (data: {
    method: string
    path: string
    userId?: string
    duration: number
    status: number
  }) => {
    const message = `${data.method} ${data.path} - ${data.status} (${data.duration}ms)`
    console.log(`🌐 ${message}`)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'api.request',
        ...data,
      })
    }
  },

  /**
   * Task queue event
   */
  taskQueued: (data: {
    taskType: string
    taskId: string
    userId?: string
    data?: any
  }) => {
    const message = `Task queued: ${data.taskType}`
    console.log(`📋 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'task.queued',
        ...data,
      })
    }
  },

  /**
   * Task completed event
   */
  taskCompleted: (data: {
    taskType: string
    taskId: string
    duration: number
    success: boolean
  }) => {
    const message = `Task ${data.success ? 'completed' : 'failed'}: ${data.taskType}`
    console.log(`✅ ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'task.completed',
        ...data,
      })
    }
  },

  /**
   * Blog article generated event
   */
  blogGenerated: (data: { slug: string; title: string; wordCount: number }) => {
    const message = `Blog article generated: ${data.title}`
    console.log(`📝 ${message}`, data)
    if (isProduction) {
      axiomLog.info(message, {
        event: 'blog.generated',
        ...data,
      })
    }
  },
}

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()

  return fn()
    .then((result) => {
      const duration = Date.now() - start
      logger.debug(`Performance: ${operation}`, { duration })
      return result
    })
    .catch((error) => {
      const duration = Date.now() - start
      logger.error(`Performance (failed): ${operation}`, error, { duration })
      throw error
    })
}

/**
 * Request context logger (for API routes)
 */
export function createRequestLogger(req: {
  method?: string
  url?: string
  headers?: any
}) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  return {
    info: (message: string, data?: Record<string, any>) => {
      logger.info(message, { requestId, ...data })
    },
    error: (message: string, error?: Error | unknown, data?: Record<string, any>) => {
      logger.error(message, error, { requestId, ...data })
    },
    warn: (message: string, data?: Record<string, any>) => {
      logger.warn(message, { requestId, ...data })
    },
    complete: (status: number) => {
      const duration = Date.now() - startTime
      logger.apiRequest({
        method: req.method || 'UNKNOWN',
        path: req.url || 'UNKNOWN',
        status,
        duration,
      })
    },
  }
}

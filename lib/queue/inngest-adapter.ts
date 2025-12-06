/**
 * Inngest Adapter for Video Processing Queue
 * Replaces BullMQ with Inngest Functions
 */

import { inngest } from '@/lib/inngest/client'
import type {
  DownloadVideoJobData,
  GenerateThumbnailJobData,
  CleanupTempJobData,
  UpdateQuotaJobData,
  JobConfig,
} from './types'

/**
 * Add a download video job (using Inngest)
 */
export async function addDownloadVideoJob(
  data: Omit<DownloadVideoJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  const result = await inngest.send({
    name: 'video/download.requested',
    data: {
      videoId: data.videoId,
      url: data.originalUrl,
      userId: data.userId,
    },
  })

  // Return the first event ID as the job ID
  return result.ids[0] || 'unknown'
}

/**
 * Add a generate thumbnail job (using Inngest)
 */
export async function addGenerateThumbnailJob(
  data: Omit<GenerateThumbnailJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  const result = await inngest.send({
    name: 'video/thumbnail.requested',
    data: {
      videoId: data.videoId,
      videoUrl: data.videoPath, // videoPath is the URL
    },
  })

  return result.ids[0] || 'unknown'
}

/**
 * Add a cleanup temp job (using Inngest)
 */
export async function addCleanupTempJob(
  data: Omit<CleanupTempJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  const result = await inngest.send({
    name: 'video/cleanup.scheduled',
    data: {
      videoId: data.videoId,
    },
  })

  return result.ids[0] || 'unknown'
}

/**
 * Add an update quota job (using Inngest)
 */
export async function addUpdateQuotaJob(
  data: Omit<UpdateQuotaJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  const result = await inngest.send({
    name: 'user/quota.update',
    data: {
      userId: data.userId,
      operation: data.operation,
      amount: 1, // Default amount
    },
  })

  return result.ids[0] || 'unknown'
}

/**
 * Queue health check (Inngest doesn't need health checks)
 */
export async function checkQueueHealth(): Promise<{
  redis: boolean
  queue: boolean
  worker: boolean
  stats: any
}> {
  try {
    // Inngest is a managed service, always healthy
    const { checkRedisHealth } = await import('../redis-upstash')
    const redisHealthy = await checkRedisHealth()

    return {
      redis: redisHealthy,
      queue: true, // Inngest is always available
      worker: true, // Inngest manages workers
      stats: {
        message: 'Using Inngest - check dashboard for stats',
      },
    }
  } catch (error) {
    console.error('Queue health check failed:', error)
    return {
      redis: false,
      queue: true, // Inngest itself is still available
      worker: true,
      stats: null,
    }
  }
}

/**
 * Initialize the queue system (no-op for Inngest)
 */
export async function initializeQueueSystem(): Promise<void> {
  console.log('✅ Using Inngest for task queue - no initialization needed')
  console.log('📊 Visit https://app.inngest.com/ for task monitoring')

  // Perform health check
  const health = await checkQueueHealth()

  if (!health.redis) {
    console.warn('⚠️  Redis health check failed')
  } else {
    console.log('✅ Redis (Upstash) connected')
  }
}

/**
 * Gracefully shutdown the queue system (no-op for Inngest)
 */
export async function shutdownQueueSystem(): Promise<void> {
  console.log('✅ Inngest queue system shutdown (no action needed)')
}

// Export the Inngest client for direct access if needed
export { inngest as queueManager }

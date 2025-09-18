/**
 * Video Processing Queue System
 * VidFab AI Video Platform - Main Export File
 */

export * from './types'
export * from './queue-manager'

// Convenience functions for adding common jobs
import { videoQueueManager } from './queue-manager'
import type {
  DownloadVideoJobData,
  GenerateThumbnailJobData,
  CleanupTempJobData,
  UpdateQuotaJobData,
  JobConfig
} from './types'

/**
 * Add a download video job to the queue
 */
export async function addDownloadVideoJob(
  data: Omit<DownloadVideoJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  return videoQueueManager.addJob('download_video', {
    ...data,
    type: 'download_video'
  }, {
    priority: 'high',
    timeout: 600000, // 10 minutes
    ...options
  })
}

/**
 * Add a generate thumbnail job to the queue
 */
export async function addGenerateThumbnailJob(
  data: Omit<GenerateThumbnailJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  return videoQueueManager.addJob('generate_thumbnail', {
    ...data,
    type: 'generate_thumbnail'
  }, {
    priority: 'normal',
    timeout: 120000, // 2 minutes
    ...options
  })
}

/**
 * Add a cleanup temp job to the queue
 */
export async function addCleanupTempJob(
  data: Omit<CleanupTempJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  return videoQueueManager.addJob('cleanup_temp', {
    ...data,
    type: 'cleanup_temp'
  }, {
    priority: 'low',
    delay: 86400000, // 24 hours delay
    timeout: 30000,  // 30 seconds
    ...options
  })
}

/**
 * Add an update quota job to the queue
 */
export async function addUpdateQuotaJob(
  data: Omit<UpdateQuotaJobData, 'type'>,
  options?: Partial<JobConfig>
): Promise<string> {
  return videoQueueManager.addJob('update_quota', {
    ...data,
    type: 'update_quota'
  }, {
    priority: 'normal',
    timeout: 30000, // 30 seconds
    ...options
  })
}

/**
 * Queue health check
 */
export async function checkQueueHealth(): Promise<{
  redis: boolean
  queue: boolean
  worker: boolean
  stats: any
}> {
  try {
    // Check Redis connection
    const { checkRedisHealth } = await import('../redis')
    const redisHealthy = await checkRedisHealth()

    // Check queue stats
    const stats = await videoQueueManager.getQueueStats()
    const workerStatus = videoQueueManager.getWorkerStatus()

    return {
      redis: redisHealthy,
      queue: true,
      worker: workerStatus?.status === 'running',
      stats
    }
  } catch (error) {
    console.error('Queue health check failed:', error)
    return {
      redis: false,
      queue: false,
      worker: false,
      stats: null
    }
  }
}

/**
 * Initialize the queue system
 */
export async function initializeQueueSystem(): Promise<void> {
  try {
    console.log('🚀 Initializing video processing queue system...')

    // Start the worker
    await videoQueueManager.startWorker({
      onActive: (job) => {
        console.log(`🔄 Processing video job: ${job.type} for user ${job.userId}`)
      },

      onProgress: (job, progress) => {
        console.log(`📊 Job progress: ${job.type} - ${progress.percent}% (${progress.message})`)
      },

      onCompleted: (job, result) => {
        console.log(`✅ Job completed: ${job.type} for user ${job.userId}`)
      },

      onFailed: (job, error) => {
        console.error(`❌ Job failed: ${job.type} for user ${job.userId}`, error)
      },

      onStalled: (job) => {
        console.warn(`⚠️ Job stalled: ${job.type} for user ${job.userId}`)
      }
    })

    // Perform health check
    const health = await checkQueueHealth()
    console.log('🏥 Queue system health check:', health)

    if (!health.redis) {
      throw new Error('Redis is not healthy')
    }

    console.log('✅ Queue system initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize queue system:', error)
    throw error
  }
}

/**
 * Gracefully shutdown the queue system
 */
export async function shutdownQueueSystem(): Promise<void> {
  try {
    console.log('🛑 Shutting down queue system...')
    await videoQueueManager.cleanup()
    console.log('✅ Queue system shutdown complete')
  } catch (error) {
    console.error('❌ Error during queue system shutdown:', error)
    throw error
  }
}

// Export the main queue manager instance
export { videoQueueManager as queueManager }
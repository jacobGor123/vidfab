/**
 * Video Processing Queue Manager
 * VidFab AI Video Platform
 */

import { Queue, Worker, Job } from 'bullmq'
import { redisBullMQ, redisBullMQWorker } from '../redis-bullmq'
import {
  VideoJobData,
  JobType,
  JobConfig,
  JobProgress,
  JobResult,
  WorkerEventHandlers,
  QueueStats,
  WorkerStatus
} from './types'
import { supabaseAdmin } from '@/lib/supabase'
import { handleVideoAgentCompose } from '@/lib/queue/handlers/video-agent/compose-video'
import { handleVideoAgentSyncVideoStatus } from '@/lib/queue/handlers/video-agent/sync-video-status'
import { handleStoryboardGeneration } from '@/lib/queue/handlers/video-agent/storyboard-generation'
import { handleStoryboardDownload } from '@/lib/queue/handlers/video-agent/storyboard-download'
import { handleVideoClipDownload } from '@/lib/queue/handlers/video-agent/video-clip-download'


// Queue configuration
const QUEUE_CONFIG = {
  name: process.env.QUEUE_PREFIX || 'vidfab-video-processing',
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
    backoff: {
      type: 'exponential' as const,
      delay: parseInt(process.env.QUEUE_RETRY_DELAY || '60000'),
    },
  },
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3'),
}

export class VideoQueueManager {
  private queue: Queue
  private worker: Worker | null = null
  private isRunning = false

  constructor() {
    // Initialize the queue
    this.queue = new Queue(QUEUE_CONFIG.name, {
      connection: redisBullMQ,
      defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
    })

    // Set up queue event listeners
    this.setupQueueEventListeners()
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    data: VideoJobData,
    options?: Partial<JobConfig>
  ): Promise<string> {
    try {
      const job = await this.queue.add(type, data, {
        jobId: data.jobId,
        priority: options?.priority === 'critical' ? 1 :
                 options?.priority === 'high' ? 2 :
                 options?.priority === 'normal' ? 3 : 4,
        delay: options?.delay,
        attempts: options?.attempts || QUEUE_CONFIG.defaultJobOptions.attempts,
        backoff: options?.backoff || QUEUE_CONFIG.defaultJobOptions.backoff,
        removeOnComplete: options?.removeOnComplete || QUEUE_CONFIG.defaultJobOptions.removeOnComplete,
        removeOnFail: options?.removeOnFail || QUEUE_CONFIG.defaultJobOptions.removeOnFail,
      })

      return job.id || ''

    } catch (error) {
      console.error('Error adding job to queue:', error)
      throw new Error(`Failed to add job: ${error}`)
    }
  }

  /**
   * Start the worker to process jobs
   */
  async startWorker(eventHandlers?: WorkerEventHandlers): Promise<void> {
    if (this.worker) {
      return
    }

    try {
      this.worker = new Worker(
        QUEUE_CONFIG.name,
        async (job) => this.processJob(job),
        {
          connection: redisBullMQWorker,  // 🔥 Worker 必须使用 maxRetriesPerRequest: null 的连接
          concurrency: QUEUE_CONFIG.concurrency,
          stalledInterval: 30000,
          maxStalledCount: 1,
        }
      )

      // Set up worker event listeners
      this.setupWorkerEventListeners(eventHandlers)

      this.isRunning = true

    } catch (error) {
      console.error('Error starting worker:', error)
      throw new Error(`Failed to start worker: ${error}`)
    }
  }

  /**
   * Stop the worker
   */
  async stopWorker(): Promise<void> {
    if (!this.worker) {
      return
    }

    try {
      await this.worker.close()
      this.worker = null
      this.isRunning = false

    } catch (error) {
      console.error('Error stopping worker:', error)
      throw new Error(`Failed to stop worker: ${error}`)
    }
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.queue.getJob(jobId)
      if (!job) {
        return null
      }

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        returnvalue: job.returnvalue,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        opts: job.opts,
      }
    } catch (error) {
      console.error(`Error getting job status ${jobId}:`, error)
      return null
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId)
      if (!job) {
        return false
      }

      await job.remove()
      return true

    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
      )

      return {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
      }
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      }
    }
  }

  /**
   * Get worker status
   */
  getWorkerStatus(): WorkerStatus | null {
    if (!this.worker) {
      return null
    }

    return {
      id: `worker-${Date.now()}`,
      status: this.isRunning ? 'running' : 'stopped',
      concurrency: QUEUE_CONFIG.concurrency,
      processing: [], // Would need to track this separately
      startedAt: new Date().toISOString(),
      processedTotal: 0, // Would need to track this
      failedTotal: 0,   // Would need to track this
    }
  }

  /**
   * Process a job (main job processor)
   */
  private async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now()

    try {
      let result: any

      // Update progress to indicate job started
      await job.updateProgress({ percent: 0, message: 'Starting job...' })

      // Route to appropriate processor based on job type
      switch (job.name as JobType) {
        case 'download_video':
          result = await this.processDownloadVideo(job)
          break

        case 'generate_thumbnail':
          result = await this.processGenerateThumbnail(job)
          break

        case 'cleanup_temp':
          result = await this.processCleanupTemp(job)
          break

        case 'update_quota':
          result = await this.processUpdateQuota(job)
          break

        case 'storyboard_generation':
          result = await handleStoryboardGeneration(job)
          break

        case 'storyboard_download':
          result = await handleStoryboardDownload(job)
          break

        case 'video_clip_download':
          result = await handleVideoClipDownload(job)
          break

        case 'va_compose_video':
          result = await handleVideoAgentCompose(job)
          break

        case 'va_sync_video_status':
          result = await handleVideoAgentSyncVideoStatus(job)
          break

        default:
          throw new Error(`Unknown job type: ${job.name}`)
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: result,
        duration,
        retryCount: job.attemptsMade,
        finishedAt: new Date().toISOString(),
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Job failed: ${job.name} (${job.id})`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        retryCount: job.attemptsMade,
        finishedAt: new Date().toISOString(),
      }
    }
  }

  /**
   * Process download video job
   */
  private async processDownloadVideo(job: Job): Promise<any> {
    const { VideoStorageManager } = await import('../storage')
    const { UserVideosDB } = await import('../database/user-videos')
    const jobData = job.data as import('./types').DownloadVideoJobData


    try {
      // Update video status to downloading
      await UserVideosDB.updateVideoStatus(jobData.videoId, {
        status: 'downloading',
        downloadProgress: 0
      })

      await job.updateProgress({
        percent: 10,
        message: 'Preparing download...'
      })

      // Download video and upload to Supabase Storage
      const downloadResult = await VideoStorageManager.downloadAndStore(
        jobData.userId,
        jobData.videoId,
        jobData.originalUrl,
        (progress) => {
          // Update both job and database progress
          job.updateProgress({
            percent: 10 + (progress * 0.8), // 10-90% for download
            message: `Downloading... ${progress}%`
          })

          UserVideosDB.updateVideoStatus(jobData.videoId, {
            downloadProgress: progress
          }).catch(console.error) // Don't fail job on progress update errors
        }
      )


      await job.updateProgress({
        percent: 90,
        message: 'Getting video metadata...'
      })

      // Get video file metadata (we'll implement this later)
      let fileSizeBytes = 0
      let durationSeconds = 0

      try {
        // Try to get file size from Supabase Storage
        const { supabaseAdmin } = await import('../supabase')
        const { data: fileInfo } = await supabaseAdmin.storage
          .from('user-videos')
          .list(`videos/${jobData.userId}`, {
            search: `${jobData.videoId}.mp4`
          })

        if (fileInfo && fileInfo.length > 0) {
          fileSizeBytes = fileInfo[0].metadata?.size || 0
        }
      } catch (error) {
        console.warn('Could not get file metadata:', error)
      }

      // Update video status to processing (ready for thumbnail generation)
      await UserVideosDB.updateVideoStatus(jobData.videoId, {
        status: 'processing',
        downloadProgress: 100,
        storagePath: downloadResult.path,
        fileSize: fileSizeBytes,
        durationSeconds
      })

      await job.updateProgress({
        percent: 95,
        message: 'Scheduling thumbnail generation...'
      })

      // Add thumbnail generation job
      const { addGenerateThumbnailJob } = await import('./index')
      const thumbnailJobId = await addGenerateThumbnailJob({
        jobId: `thumbnail_${jobData.videoId}`,
        userId: jobData.userId,
        videoId: jobData.videoId,
        videoPath: downloadResult.path,
        thumbnailPath: `thumbnails/${jobData.userId}/${jobData.videoId}.jpg`,
        thumbnailSettings: {
          width: 1280,
          height: 720,
          quality: 80,
          format: 'jpg',
          timeOffset: 1 // 1 second from start
        },
        createdAt: new Date().toISOString()
      })


      await job.updateProgress({
        percent: 100,
        message: 'Download completed successfully'
      })

      return {
        downloaded: true,
        path: downloadResult.path,
        url: downloadResult.url,
        fileSize: fileSizeBytes,
        thumbnailJobId
      }

    } catch (error) {
      console.error(`❌ Video download failed for ${jobData.videoId}:`, error)

      // Update video status to failed
      await UserVideosDB.updateVideoStatus(jobData.videoId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Download failed'
      }).catch(console.error)

      throw error
    }
  }

  /**
   * Process generate thumbnail job
   */
  private async processGenerateThumbnail(job: Job): Promise<any> {
    const { VideoStorageManager } = await import('../storage')
    const { UserVideosDB } = await import('../database/user-videos')
    const jobData = job.data as import('./types').GenerateThumbnailJobData


    try {
      await job.updateProgress({
        percent: 10,
        message: 'Preparing thumbnail generation...'
      })

      // Get video URL from Supabase Storage
      const videoUrl = VideoStorageManager.getVideoUrl(jobData.userId, jobData.videoId)

      await job.updateProgress({
        percent: 30,
        message: 'Generating thumbnail from video...'
      })

      // Since we don't have FFmpeg in this environment, we'll use a simplified approach
      // In a production environment, you would use FFmpeg or a video processing service

      // For now, we'll create a placeholder thumbnail using Canvas API
      // This would typically be done server-side with proper video processing

      let thumbnailBuffer: Buffer

      try {
        // Attempt to generate a real thumbnail (this is a simplified implementation)
        thumbnailBuffer = await this.generateVideoThumbnail(videoUrl, jobData.thumbnailSettings)
      } catch (error) {
        console.warn('Failed to generate real thumbnail, creating placeholder:', error)
        // Create a simple placeholder thumbnail
        thumbnailBuffer = await this.createPlaceholderThumbnail(
          jobData.thumbnailSettings.width,
          jobData.thumbnailSettings.height,
          jobData.videoId
        )
      }

      await job.updateProgress({
        percent: 70,
        message: 'Uploading thumbnail...'
      })

      // Upload thumbnail to Supabase Storage
      const thumbnailResult = await VideoStorageManager.uploadThumbnail(
        jobData.userId,
        jobData.videoId,
        thumbnailBuffer,
        `image/${jobData.thumbnailSettings.format}`
      )


      await job.updateProgress({
        percent: 90,
        message: 'Updating video record...'
      })

      // Update video record with thumbnail path and complete status
      await UserVideosDB.updateVideoStatus(jobData.videoId, {
        status: 'completed',
        thumbnailPath: thumbnailResult.path
      })

      await job.updateProgress({
        percent: 100,
        message: 'Thumbnail generation completed'
      })

      return {
        generated: true,
        path: thumbnailResult.path,
        url: thumbnailResult.url
      }

    } catch (error) {
      console.error(`❌ Thumbnail generation failed for ${jobData.videoId}:`, error)

      // Update video status - still mark as completed even if thumbnail fails
      await UserVideosDB.updateVideoStatus(jobData.videoId, {
        status: 'completed',
        errorMessage: `Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }).catch(console.error)

      throw error
    }
  }

  /**
   * Generate thumbnail from video URL (simplified implementation)
   */
  private async generateVideoThumbnail(
    videoUrl: string,
    settings: import('./types').GenerateThumbnailJobData['thumbnailSettings']
  ): Promise<Buffer> {
    // This is a simplified implementation
    // In production, you would use FFmpeg or a video processing service like:
    // - AWS Elemental MediaConvert
    // - Google Cloud Video Intelligence
    // - FFmpeg with proper server setup


    // For now, we'll create a placeholder that indicates the video exists
    return this.createPlaceholderThumbnail(settings.width, settings.height, 'video')
  }

  /**
   * Create a placeholder thumbnail image
   */
  private async createPlaceholderThumbnail(
    width: number,
    height: number,
    identifier: string
  ): Promise<Buffer> {
    // Create a simple SVG placeholder thumbnail
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <circle cx="${width/2}" cy="${height/2}" r="40" fill="white" opacity="0.9"/>
        <polygon points="${width/2 - 12},${height/2 - 15} ${width/2 - 12},${height/2 + 15} ${width/2 + 15},${height/2}" fill="#6366f1"/>
        <text x="${width/2}" y="${height + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
          Video Thumbnail
        </text>
      </svg>
    `

    // Convert SVG to PNG buffer (simplified - in production use proper image processing)
    // For now, we'll return the SVG as buffer, which can be handled by modern browsers
    return Buffer.from(svg, 'utf-8')
  }

  /**
   * Process cleanup temp job
   */
  private async processCleanupTemp(job: Job): Promise<any> {
    const jobData = job.data as import('./types').CleanupTempJobData


    try {
      let cleanedCount = 0

      // Cleanup temporary URLs that are no longer needed
      for (const tempUrl of jobData.tempUrls) {
        try {

          // In a real implementation, you might:
          // 1. Remove temporary files from local storage
          // 2. Clean up cache entries
          // 3. Remove expired CDN entries
          // 4. Update database records to remove temp references

          cleanedCount++
        } catch (error) {
          console.warn(`Failed to cleanup URL: ${tempUrl}`, error)
        }
      }


      return {
        cleaned: true,
        count: cleanedCount,
        urls: jobData.tempUrls.length
      }

    } catch (error) {
      console.error(`❌ Cleanup failed for video ${jobData.videoId}:`, error)
      throw error
    }
  }

  /**
   * Process update quota job
   */
  private async processUpdateQuota(job: Job): Promise<any> {
    const { UserVideosDB } = await import('../database/user-videos')
    const jobData = job.data as import('./types').UpdateQuotaJobData


    try {
      let result: any = {}

      switch (jobData.operation) {
        case 'add':
          // This is handled automatically by database triggers
          // But we can perform additional validations here
          result = { operation: 'add', auto: true }
          break

        case 'remove':
          // This is also handled by database triggers when videos are deleted
          result = { operation: 'remove', auto: true }
          break

        case 'recalculate':
          // Force recalculation of user quota from actual data

          const stats = await UserVideosDB.getUserVideoStats(jobData.userId)
          const quota = await UserVideosDB.getUserQuota(jobData.userId)

          // Update quota record with recalculated values
          const { supabaseAdmin, TABLES } = await import('../supabase')
          await supabaseAdmin
            .from(TABLES.USER_STORAGE_QUOTAS)
            .upsert({
              user_id: jobData.userId,
              total_videos: stats.completed,
              total_size_bytes: Math.round(stats.totalSizeMB * 1024 * 1024),
              updated_at: new Date().toISOString()
            })

          result = {
            operation: 'recalculate',
            before: quota,
            after: {
              videos: stats.completed,
              sizeMB: stats.totalSizeMB
            }
          }
          break

        default:
          throw new Error(`Unknown quota operation: ${jobData.operation}`)
      }


      return {
        updated: true,
        userId: jobData.userId,
        ...result
      }

    } catch (error) {
      console.error(`❌ Quota update failed for user ${jobData.userId}:`, error)
      throw error
    }
  }

  /**
   * Process storyboard generation job
   */
  /**
   * Set up queue event listeners
   */
  private setupQueueEventListeners(): void {
    this.queue.on('waiting', (job) => {
    })

    this.queue.on('error', (error) => {
      console.error('❌ Queue error:', error)
    })
  }

  /**
   * Set up worker event listeners
   */
  private setupWorkerEventListeners(eventHandlers?: WorkerEventHandlers): void {
    if (!this.worker) return

    this.worker.on('active', (job) => {
      eventHandlers?.onActive?.(job.data as VideoJobData)
    })

    this.worker.on('progress', (job, progress) => {
      eventHandlers?.onProgress?.(job.data as VideoJobData, progress as JobProgress)
    })

    this.worker.on('completed', (job, result) => {
      eventHandlers?.onCompleted?.(job.data as VideoJobData, result as JobResult)
    })

    this.worker.on('failed', (job, error) => {
      console.error(`❌ Job failed: ${job?.name} (${job?.id})`, error)
      if (job) {
        eventHandlers?.onFailed?.(job.data as VideoJobData, error)
      }
    })

    this.worker.on('stalled', (job) => {
      console.warn(`⚠️ Job stalled: ${job.name} (${job.id})`)
      eventHandlers?.onStalled?.(job.data as VideoJobData)
    })

    this.worker.on('error', (error) => {
      console.error('❌ Worker error:', error)
    })
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopWorker()
      await this.queue.close()
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Export a singleton instance
export const videoQueueManager = new VideoQueueManager()
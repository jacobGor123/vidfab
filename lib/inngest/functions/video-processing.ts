/**
 * Inngest Video Processing Functions
 * Replaces BullMQ queue workers for video-related tasks
 */

import { inngest } from '../client'
import { logger } from '@/lib/logger'

/**
 * Video Download Function
 * Downloads video from Wavespeed/BytePlus and uploads to Supabase Storage
 */
export const downloadVideo = inngest.createFunction(
  {
    id: 'download-video',
    name: 'Download Video from AI Provider',
    retries: 3,
    timeout: '10m', // 10 minutes for large videos
  },
  { event: 'video/download.requested' },
  async ({ event, step }) => {
    const { videoId, url, userId } = event.data

    logger.info('Video download started', { videoId, userId })

    try {
      // Step 1: Update video status to downloading
      await step.run('update-status-downloading', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        await UserVideosDB.updateVideoStatus(videoId, {
          status: 'downloading',
          downloadProgress: 0,
        })
      })

      // Step 2: Download video from provider
      const videoBuffer = await step.run('download-from-provider', async () => {
        const { VideoStorageManager } = await import('@/lib/storage')

        // Download with progress tracking
        const downloadResult = await VideoStorageManager.downloadAndStoreByUserVideo(
          userId,
          videoId,
          url,
          (progress) => {
            // Progress updates are logged but don't block execution
            logger.debug('Download progress', { videoId, progress })
          }
        )

        return downloadResult
      })

      // Step 3: Get video metadata
      const metadata = await step.run('get-video-metadata', async () => {
        const { supabaseAdmin } = await import('@/lib/supabase')

        try {
          const { data: fileInfo } = await supabaseAdmin.storage
            .from('user-videos')
            .list(`videos/${userId}`, {
              search: `${videoId}.mp4`,
            })

          const fileSizeBytes = fileInfo?.[0]?.metadata?.size || 0

          return {
            fileSize: fileSizeBytes,
            duration: 0, // Will be extracted if needed
          }
        } catch (error) {
          logger.warn('Could not get file metadata', { error, videoId })
          return { fileSize: 0, duration: 0 }
        }
      })

      // Step 4: Update video status to processing
      await step.run('update-status-processing', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        await UserVideosDB.updateVideoStatus(videoId, {
          status: 'processing',
          downloadProgress: 100,
          storagePath: videoBuffer.path,
          fileSize: metadata.fileSize,
          durationSeconds: metadata.duration,
        })
      })

      // Step 5: Trigger thumbnail generation
      await step.run('trigger-thumbnail-generation', async () => {
        await inngest.send({
          name: 'video/thumbnail.requested',
          data: {
            videoId,
            videoUrl: videoBuffer.url,
          },
        })
      })

      // Step 6: Schedule cleanup after 24 hours (for free users)
      await step.sleep('wait-24h', '24h')

      await step.run('schedule-cleanup', async () => {
        await inngest.send({
          name: 'video/cleanup.scheduled',
          data: { videoId },
        })
      })

      logger.videoDownloaded({
        videoId,
        userId,
        fileSize: metadata.fileSize,
        duration: metadata.duration,
      })

      return {
        success: true,
        videoId,
        path: videoBuffer.path,
        url: videoBuffer.url,
        fileSize: metadata.fileSize,
      }
    } catch (error) {
      logger.error('Video download failed', error, { videoId, userId })

      // Update video status to failed
      const { UserVideosDB } = await import('@/lib/database/user-videos')
      await UserVideosDB.updateVideoStatus(videoId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Download failed',
      }).catch(console.error)

      throw error
    }
  }
)

/**
 * Thumbnail Generation Function
 * Uses Cloudinary to generate thumbnails from video URLs
 */
export const generateThumbnail = inngest.createFunction(
  {
    id: 'generate-thumbnail',
    name: 'Generate Video Thumbnail',
    retries: 3,
    timeout: '2m',
  },
  { event: 'video/thumbnail.requested' },
  async ({ event, step }) => {
    const { videoId, videoUrl } = event.data

    logger.info('Thumbnail generation started', { videoId })

    try {
      // Step 1: Get video info from database
      const videoInfo = await step.run('get-video-info', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        const video = await UserVideosDB.getVideoById(videoId)
        return video
      })

      if (!videoInfo) {
        throw new Error(`Video not found: ${videoId}`)
      }

      // Step 2: Download video and extract thumbnail
      const thumbnailBuffer = await step.run('extract-thumbnail', async () => {
        const { extractVideoThumbnail } = await import('@/lib/discover/extract-thumbnail')

        // Download video
        const response = await fetch(videoUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`)
        }

        const videoBuffer = Buffer.from(await response.arrayBuffer())

        // Extract thumbnail using ffmpeg
        const result = await extractVideoThumbnail(videoBuffer, {
          timestamp: 0.1,
          format: 'webp',
          maxWidth: 1280,
          maxHeight: 720,
          quality: 85,
          targetSizeKB: 100
        })

        if (!result.success || !result.buffer) {
          throw new Error(result.error || 'Thumbnail extraction failed')
        }

        logger.debug('Thumbnail extracted', { videoId, size: result.size })

        return result.buffer
      })

      // Step 3: Upload thumbnail to Supabase Storage
      const thumbnailUrl = await step.run('upload-thumbnail', async () => {
        const { supabaseAdmin } = await import('@/lib/supabase')

        const thumbnailFileName = `${videoInfo.user_id}/${videoId}-thumbnail.webp`
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('video-thumbnails')
          .upload(thumbnailFileName, thumbnailBuffer, {
            contentType: 'image/webp',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Thumbnail upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data } = supabaseAdmin
          .storage
          .from('video-thumbnails')
          .getPublicUrl(thumbnailFileName)

        logger.debug('Thumbnail uploaded', { videoId, url: data.publicUrl })

        return thumbnailFileName // Store relative path, not full URL
      })

      // Step 4: Update video record with thumbnail
      await step.run('update-video-record', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        await UserVideosDB.updateVideoStatus(videoId, {
          status: 'completed',
          thumbnailPath: thumbnailUrl,
        })
      })

      logger.thumbnailGenerated({
        videoId,
        userId: videoInfo.user_id,
        thumbnailUrl,
      })

      return {
        success: true,
        videoId,
        thumbnailUrl,
      }
    } catch (error) {
      logger.error('Thumbnail generation failed', error, { videoId })

      // Mark video as completed even if thumbnail fails
      const { UserVideosDB } = await import('@/lib/database/user-videos')
      await UserVideosDB.updateVideoStatus(videoId, {
        status: 'completed',
        errorMessage: `Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }).catch(console.error)

      throw error
    }
  }
)

/**
 * Cleanup Temporary Files Function
 * Removes expired videos (free users after 24h)
 */
export const cleanupTempFiles = inngest.createFunction(
  {
    id: 'cleanup-temp-files',
    name: 'Cleanup Temporary Files',
    retries: 2,
    timeout: '5m',
  },
  { event: 'video/cleanup.scheduled' },
  async ({ event, step }) => {
    const { videoId } = event.data

    logger.info('Cleanup started', { videoId })

    try {
      // Step 1: Get video info
      const videoInfo = await step.run('get-video-info', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

        const video = await UserVideosDB.getVideoById(videoId)

        if (!video) {
          logger.warn('Video not found for cleanup', { videoId })
          return null
        }

        // Get user subscription info
        const { data: profile } = await supabaseAdmin
          .from(TABLES.PROFILES)
          .select('subscription_plan')
          .eq('id', video.user_id)
          .single()

        return {
          ...video,
          subscriptionPlan: profile?.subscription_plan || 'free',
        }
      })

      if (!videoInfo) {
        return { success: true, message: 'Video not found, nothing to cleanup' }
      }

      // Step 2: Delete video files for free users
      if (videoInfo.subscriptionPlan === 'free') {
        await step.run('delete-video-files', async () => {
          const { supabaseAdmin } = await import('@/lib/supabase')

          // Delete video file from storage
          await supabaseAdmin.storage
            .from('user-videos')
            .remove([`videos/${videoInfo.user_id}/${videoId}.mp4`])

          logger.info('Video file deleted', { videoId, userId: videoInfo.user_id })
        })

        // Step 3: Update database status
        await step.run('update-database-status', async () => {
          const { UserVideosDB } = await import('@/lib/database/user-videos')
          await UserVideosDB.updateVideoStatus(videoId, {
            status: 'expired',
          })
        })

        logger.info('Cleanup completed', { videoId })

        return {
          success: true,
          videoId,
          message: 'Free user video expired and cleaned up',
        }
      } else {
        logger.info('Premium user video, no cleanup needed', {
          videoId,
          plan: videoInfo.subscriptionPlan,
        })

        return {
          success: true,
          videoId,
          message: 'Premium user, no cleanup needed',
        }
      }
    } catch (error) {
      logger.error('Cleanup failed', error, { videoId })
      throw error
    }
  }
)

/**
 * Update User Quota Function
 * Recalculates user storage quota
 */
export const updateUserQuota = inngest.createFunction(
  {
    id: 'update-user-quota',
    name: 'Update User Storage Quota',
    retries: 2,
    timeout: '1m',
  },
  { event: 'user/quota.update' },
  async ({ event, step }) => {
    const { userId, operation, amount } = event.data

    logger.info('Quota update started', { userId, operation })

    try {
      await step.run('recalculate-quota', async () => {
        const { UserVideosDB } = await import('@/lib/database/user-videos')
        const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

        // Get current statistics
        const stats = await UserVideosDB.getUserVideoStats(userId)

        // Update quota record
        await supabaseAdmin.from(TABLES.USER_STORAGE_QUOTAS).upsert({
          user_id: userId,
          total_videos: stats.completed,
          total_size_bytes: Math.round(stats.totalSizeMB * 1024 * 1024),
          updated_at: new Date().toISOString(),
        })

        logger.info('Quota updated', {
          userId,
          videos: stats.completed,
          sizeMB: stats.totalSizeMB,
        })
      })

      return {
        success: true,
        userId,
        operation,
      }
    } catch (error) {
      logger.error('Quota update failed', error, { userId })
      throw error
    }
  }
)

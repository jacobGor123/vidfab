/**
 * Resilient Storage Operations with Enhanced Error Handling
 * VidFab AI Video Platform
 */

import { VideoStorageManager } from '@/lib/storage'
import { UserVideosDB } from '@/lib/database/user-videos'
import {
  resilientStorageOperation,
  retryWithBackoff,
  ErrorReporter,
  withFallback
} from '@/lib/utils/error-handling'

export interface VideoDownloadProgress {
  videoId: string
  progress: number
  status: 'downloading' | 'processing' | 'completed' | 'failed'
  error?: string
  storagePath?: string
  thumbnailPath?: string
  fileSize?: number
}

export class ResilientVideoProcessor {
  private storage: VideoStorageManager
  private errorReporter: ErrorReporter

  constructor() {
    this.storage = new VideoStorageManager()
    this.errorReporter = ErrorReporter.getInstance()
  }

  /**
   * Download and process video with enhanced error handling and progress tracking
   */
  async downloadAndProcessVideo(
    videoId: string,
    originalUrl: string,
    storagePath: string,
    onProgress?: (progress: VideoDownloadProgress) => void
  ): Promise<{
    success: boolean
    storagePath?: string
    thumbnailPath?: string
    fileSize?: number
    error?: string
  }> {
    const updateProgress = (updates: Partial<VideoDownloadProgress>) => {
      const progress: VideoDownloadProgress = {
        videoId,
        progress: 0,
        status: 'downloading',
        ...updates
      }
      onProgress?.(progress)
    }

    try {
      updateProgress({ progress: 0, status: 'downloading' })

      // Step 1: Download video with resilient operation
      let downloadResult: any
      try {
        downloadResult = await resilientStorageOperation(
          async () => {
            return await this.storage.downloadAndStore(
              originalUrl,
              storagePath,
              (progress) => {
                updateProgress({ progress: Math.round(progress * 0.7) }) // 70% for download
              }
            )
          },
          'Video download'
        )
      } catch (downloadError) {
        this.errorReporter.reportError(downloadError, 'Video download failed')
        updateProgress({
          progress: 0,
          status: 'failed',
          error: 'Failed to download video from source'
        })

        // Try alternative download method
        return await this.tryAlternativeDownload(videoId, originalUrl, storagePath, updateProgress)
      }

      updateProgress({ progress: 70, status: 'processing' })

      // Step 2: Generate thumbnail with fallback
      let thumbnailPath: string | undefined
      try {
        thumbnailPath = await this.generateVideoThumbnail(videoId, storagePath, updateProgress)
      } catch (thumbnailError) {
        console.warn('Thumbnail generation failed, continuing without:', thumbnailError)
        // Don't fail the entire process for thumbnail issues
      }

      updateProgress({ progress: 90, status: 'processing' })

      // Step 3: Update database with resilient operation
      await resilientStorageOperation(
        async () => {
          await UserVideosDB.updateVideoStatus(videoId, {
            status: 'completed',
            storagePath,
            thumbnailPath,
            fileSize: downloadResult.size,
            downloadProgress: 100
          })
        },
        'Database update - video completion'
      )

      updateProgress({
        progress: 100,
        status: 'completed',
        storagePath,
        thumbnailPath,
        fileSize: downloadResult.size
      })

      return {
        success: true,
        storagePath,
        thumbnailPath,
        fileSize: downloadResult.size
      }

    } catch (error) {
      this.errorReporter.reportError(error, 'Video processing pipeline')

      // Update database with error status
      try {
        await UserVideosDB.updateVideoStatus(videoId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Processing failed',
          downloadProgress: 0
        })
      } catch (dbError) {
        this.errorReporter.reportError(dbError, 'Database error update failed')
      }

      updateProgress({
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  /**
   * Alternative download method when primary method fails
   */
  private async tryAlternativeDownload(
    videoId: string,
    originalUrl: string,
    storagePath: string,
    updateProgress: (updates: Partial<VideoDownloadProgress>) => void
  ): Promise<{
    success: boolean
    storagePath?: string
    error?: string
  }> {
    try {
      updateProgress({ progress: 0, status: 'downloading' })

      // Try direct fetch approach with smaller chunks
      const response = await fetch(originalUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()

      // Upload blob to storage
      const result = await resilientStorageOperation(
        async () => {
          return await this.storage.uploadBlob(storagePath, blob)
        },
        'Alternative video upload'
      )

      updateProgress({ progress: 100, status: 'completed' })

      return {
        success: true,
        storagePath
      }

    } catch (error) {
      this.errorReporter.reportError(error, 'Alternative download method')
      updateProgress({
        progress: 0,
        status: 'failed',
        error: 'All download methods failed'
      })

      return {
        success: false,
        error: 'All download methods failed'
      }
    }
  }

  /**
   * Generate video thumbnail with fallback options
   */
  private async generateVideoThumbnail(
    videoId: string,
    storagePath: string,
    updateProgress: (updates: Partial<VideoDownloadProgress>) => void
  ): Promise<string | undefined> {
    return await withFallback(
      // Primary: Generate actual video thumbnail (requires FFmpeg)
      async () => {
        updateProgress({ progress: 80, status: 'processing' })
        // This would require FFmpeg integration
        throw new Error('FFmpeg thumbnail generation not implemented yet')
      },
      // Fallback: Generate simple SVG placeholder
      async () => {
        updateProgress({ progress: 85, status: 'processing' })

        const thumbnailPath = `thumbnails/${videoId}_thumb.svg`
        const svgContent = `
          <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1a1a1a"/>
            <circle cx="160" cy="90" r="30" fill="#ffffff" fill-opacity="0.8"/>
            <polygon points="150,75 150,105 175,90" fill="#1a1a1a"/>
            <text x="160" y="130" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">
              Video Thumbnail
            </text>
          </svg>
        `.trim()

        const blob = new Blob([svgContent], { type: 'image/svg+xml' })

        await resilientStorageOperation(
          async () => {
            return await this.storage.uploadBlob(thumbnailPath, blob)
          },
          'Thumbnail upload'
        )

        return thumbnailPath
      },
      // Only use fallback if primary method fails
      (error) => true
    )
  }

  /**
   * Clean up failed or temporary video files
   */
  async cleanupFailedVideo(videoId: string): Promise<void> {
    try {
      await resilientStorageOperation(
        async () => {
          // Delete video file if exists
          const videoPath = `videos/${videoId}.mp4`
          await this.storage.deleteFile(videoPath)

          // Delete thumbnail if exists
          const thumbnailPath = `thumbnails/${videoId}_thumb.svg`
          await this.storage.deleteFile(thumbnailPath)
        },
        'Video cleanup'
      )

      console.log(`Cleaned up failed video: ${videoId}`)
    } catch (error) {
      this.errorReporter.reportError(error, 'Video cleanup failed')
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Verify video file integrity
   */
  async verifyVideoIntegrity(storagePath: string): Promise<boolean> {
    try {
      return await resilientStorageOperation(
        async () => {
          const fileInfo = await this.storage.getFileInfo(storagePath)

          // Basic integrity checks
          if (!fileInfo || fileInfo.size === 0) {
            return false
          }

          // Check if file is accessible
          const url = await this.storage.getPublicUrl(storagePath)
          if (!url) {
            return false
          }

          return true
        },
        'Video integrity check'
      )
    } catch (error) {
      this.errorReporter.reportError(error, 'Video integrity verification')
      return false
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    recentErrors: any[]
    circuitBreakerStatus: any
  } {
    return {
      recentErrors: this.errorReporter.getRecentErrors(10),
      circuitBreakerStatus: {} // Would be populated by circuit breakers if implemented
    }
  }
}
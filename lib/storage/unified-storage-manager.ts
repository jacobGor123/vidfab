/**
 * Unified Storage Manager
 * Implements 1GB universal storage limit with 24h auto-deletion for free users
 */

import { supabaseAdmin, TABLES } from '../supabase'
import { UserVideo } from '../supabase'

export interface UnifiedStorageStatus {
  currentSizeBytes: number
  currentSizeMB: number
  maxSizeBytes: number
  maxSizeMB: number
  storagePercentage: number
  totalVideos: number
  totalImages: number  // 🔥 添加图片数量
  isSubscribed: boolean
  freeUserExpiredVideos: UserVideo[]
  canUpload: boolean
}

export class UnifiedStorageManager {
  // Universal 1GB storage limit for all users
  private static readonly MAX_STORAGE_BYTES = 1073741824 // 1GB
  private static readonly FREE_USER_RETENTION_HOURS = 24

  /**
   * Get unified storage status for user
   */
  static async getStorageStatus(userId: string, isSubscribed: boolean): Promise<UnifiedStorageStatus> {
    try {
      // Get all completed videos (only completed videos count toward storage)
      const { data: videos, error: videoError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('file_size', 'is', null)
        .order('updated_at', { ascending: true }) // Oldest first for deletion priority

      if (videoError) {
        console.error('Error fetching videos for storage status:', videoError)
        throw videoError
      }

      // Get all completed images
      const { data: images, error: imageError } = await supabaseAdmin
        .from(TABLES.USER_IMAGES)
        .select('id, file_size, created_at, updated_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('file_size', 'is', null)
        .order('updated_at', { ascending: true })

      if (imageError) {
        console.error('Error fetching images for storage status:', imageError)
      }

      const allVideos = videos || []
      const allImages = images || []

      // Calculate total storage used (videos + images)
      const videoSizeBytes = allVideos.reduce((sum, video) => sum + (video.file_size || 0), 0)
      const imageSizeBytes = allImages.reduce((sum, image) => sum + (image.file_size || 0), 0)
      const totalSizeBytes = videoSizeBytes + imageSizeBytes

      const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100
      const maxSizeMB = Math.round(this.MAX_STORAGE_BYTES / (1024 * 1024))
      const storagePercentage = Math.round((totalSizeBytes / this.MAX_STORAGE_BYTES) * 100 * 10) / 10

      // Find expired videos for free users (24h after completion)
      const expiredVideos: UserVideo[] = []
      if (!isSubscribed) {
        const cutoffTime = new Date(Date.now() - this.FREE_USER_RETENTION_HOURS * 60 * 60 * 1000)

        for (const video of allVideos) {
          // Use updated_at as completion time (when status changed to 'completed')
          const completionTime = new Date(video.updated_at)
          if (completionTime < cutoffTime) {
            expiredVideos.push(video)
          }
        }
      }

      return {
        currentSizeBytes: totalSizeBytes,
        currentSizeMB: totalSizeMB,
        maxSizeBytes: this.MAX_STORAGE_BYTES,
        maxSizeMB,
        storagePercentage,
        totalVideos: allVideos.length,
        totalImages: allImages.length,
        isSubscribed,
        freeUserExpiredVideos: expiredVideos,
        canUpload: totalSizeBytes < this.MAX_STORAGE_BYTES
      }

    } catch (error) {
      console.error('Error getting storage status:', error)
      return {
        currentSizeBytes: 0,
        currentSizeMB: 0,
        maxSizeBytes: this.MAX_STORAGE_BYTES,
        maxSizeMB: 1024,
        storagePercentage: 0,
        totalVideos: 0,
        totalImages: 0,
        isSubscribed,
        freeUserExpiredVideos: [],
        canUpload: true
      }
    }
  }

  /**
   * Clean up expired videos for free users (24h after completion)
   */
  static async cleanupExpiredVideos(userId: string, isSubscribed: boolean): Promise<{
    deletedCount: number
    freedSizeMB: number
  }> {
    if (isSubscribed) {
      return { deletedCount: 0, freedSizeMB: 0 }
    }

    try {
      const cutoffTime = new Date(Date.now() - this.FREE_USER_RETENTION_HOURS * 60 * 60 * 1000)

      // Find expired videos (completed more than 24h ago)
      const { data: expiredVideos, error: fetchError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('id, file_size, updated_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .lt('updated_at', cutoffTime.toISOString())

      if (fetchError) {
        console.error('Error fetching expired videos:', fetchError)
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      if (!expiredVideos || expiredVideos.length === 0) {
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      console.log(`🗑️ Found ${expiredVideos.length} expired videos for free user ${userId}`)

      // Calculate freed space
      const freedBytes = expiredVideos.reduce((sum, video) => sum + (video.file_size || 0), 0)
      const freedSizeMB = Math.round(freedBytes / (1024 * 1024) * 100) / 100

      // Soft delete expired videos
      const videoIds = expiredVideos.map(v => v.id)
      const { error: deleteError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .in('id', videoIds)

      if (deleteError) {
        console.error('Error deleting expired videos:', deleteError)
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      console.log(`✅ Deleted ${videoIds.length} expired videos, freed ${freedSizeMB}MB`)

      return {
        deletedCount: videoIds.length,
        freedSizeMB
      }

    } catch (error) {
      console.error('Error in cleanupExpiredVideos:', error)
      return { deletedCount: 0, freedSizeMB: 0 }
    }
  }

  /**
   * Enforce 1GB storage limit by deleting oldest videos
   */
  static async enforceStorageLimit(userId: string): Promise<{
    deletedCount: number
    freedSizeMB: number
  }> {
    try {
      // Get current storage status
      const { data: videos, error } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('id, file_size, updated_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('file_size', 'is', null)
        .order('updated_at', { ascending: true }) // Oldest first

      if (error) {
        console.error('Error fetching videos for storage enforcement:', error)
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      const allVideos = videos || []
      const totalSize = allVideos.reduce((sum, video) => sum + (video.file_size || 0), 0)

      // If under limit, no action needed
      if (totalSize <= this.MAX_STORAGE_BYTES) {
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      console.log(`🚨 Storage limit exceeded: ${Math.round(totalSize / (1024 * 1024))}MB / 1GB`)

      // Delete oldest videos until under limit
      let deletedVideos = []
      let freedBytes = 0
      let remainingSize = totalSize

      for (const video of allVideos) {
        if (remainingSize <= this.MAX_STORAGE_BYTES) {
          break
        }

        deletedVideos.push(video.id)
        freedBytes += video.file_size || 0
        remainingSize -= video.file_size || 0
      }

      if (deletedVideos.length === 0) {
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      // Soft delete the videos
      const { error: deleteError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .in('id', deletedVideos)

      if (deleteError) {
        console.error('Error deleting videos for storage limit:', deleteError)
        return { deletedCount: 0, freedSizeMB: 0 }
      }

      const freedSizeMB = Math.round(freedBytes / (1024 * 1024) * 100) / 100

      console.log(`✅ Deleted ${deletedVideos.length} videos to enforce storage limit, freed ${freedSizeMB}MB`)

      return {
        deletedCount: deletedVideos.length,
        freedSizeMB
      }

    } catch (error) {
      console.error('Error in enforceStorageLimit:', error)
      return { deletedCount: 0, freedSizeMB: 0 }
    }
  }

  /**
   * Clean up failed videos immediately (they don't count toward storage but should be removed)
   */
  static async cleanupFailedVideos(userId: string): Promise<number> {
    try {
      const { data: failedVideos, error: fetchError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'failed')

      if (fetchError || !failedVideos || failedVideos.length === 0) {
        return 0
      }

      const { error: deleteError } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .in('id', failedVideos.map(v => v.id))

      if (deleteError) {
        console.error('Error deleting failed videos:', deleteError)
        return 0
      }

      console.log(`🧹 Cleaned up ${failedVideos.length} failed videos`)
      return failedVideos.length

    } catch (error) {
      console.error('Error cleaning up failed videos:', error)
      return 0
    }
  }

  /**
   * Comprehensive storage cleanup - run on user operations
   */
  static async performStorageCleanup(userId: string, isSubscribed: boolean): Promise<{
    expiredDeleted: number
    limitDeleted: number
    failedDeleted: number
    totalFreedMB: number
  }> {
    console.log(`🧹 Starting comprehensive storage cleanup for user ${userId} (subscribed: ${isSubscribed})`)

    // 1. Clean up failed videos first (immediate)
    const failedDeleted = await this.cleanupFailedVideos(userId)

    // 2. Clean up expired videos for free users (24h rule)
    const expiredResult = await this.cleanupExpiredVideos(userId, isSubscribed)

    // 3. Enforce 1GB storage limit (universal)
    const limitResult = await this.enforceStorageLimit(userId)

    const totalFreedMB = expiredResult.freedSizeMB + limitResult.freedSizeMB

    console.log(`✅ Storage cleanup completed: ${expiredResult.deletedCount} expired, ${limitResult.deletedCount} over-limit, ${failedDeleted} failed, ${totalFreedMB}MB freed`)

    return {
      expiredDeleted: expiredResult.deletedCount,
      limitDeleted: limitResult.deletedCount,
      failedDeleted,
      totalFreedMB
    }
  }
}
/**
 * User Videos Database Operations
 * VidFab AI Video Platform
 */

import { supabase, supabaseAdmin, TABLES, handleSupabaseError } from '../supabase'
import type { UserVideo, UserStorageQuota, UserQuotaInfo } from '../supabase'
import { resilientDbOperation, ErrorReporter } from '@/lib/utils/error-handling'

export class UserVideosDB {

  /**
   * Create a new video record
   */
  static async createVideo(
    userId: string,
    data: {
      wavespeedRequestId: string
      prompt: string
      settings: UserVideo['settings']
      originalUrl?: string
    }
  ): Promise<UserVideo> {
    return resilientDbOperation(
      async () => {
        const { data: video, error } = await supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .insert({
            user_id: userId,
            wavespeed_request_id: data.wavespeedRequestId,
            prompt: data.prompt,
            settings: data.settings,
            original_url: data.originalUrl,
            status: 'generating'
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating video:', error)
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.createVideo')
          handleSupabaseError(error)
        }

        return video as UserVideo
      },
      'Create video'
    )
  }

  /**
   * Update video status and progress
   */
  static async updateVideoStatus(
    videoId: string,
    updates: {
      status?: UserVideo['status']
      downloadProgress?: number
      errorMessage?: string
      storagePath?: string
      thumbnailPath?: string
      fileSize?: number
      durationSeconds?: number
    }
  ): Promise<UserVideo> {
    return resilientDbOperation(
      async () => {
        const updateData: any = {}

        if (updates.status) updateData.status = updates.status
        if (updates.downloadProgress !== undefined) updateData.download_progress = updates.downloadProgress
        if (updates.errorMessage) updateData.error_message = updates.errorMessage
        if (updates.storagePath) updateData.storage_path = updates.storagePath
        if (updates.thumbnailPath) updateData.thumbnail_path = updates.thumbnailPath
        if (updates.fileSize) updateData.file_size = updates.fileSize
        if (updates.durationSeconds) updateData.duration_seconds = updates.durationSeconds

        const { data: video, error } = await supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .update(updateData)
          .eq('id', videoId)
          .select()
          .single()

        if (error) {
          console.error('Error updating video:', error)
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.updateVideoStatus')
          handleSupabaseError(error)
        }

        return video as UserVideo
      },
      `Update video status (${videoId})`
    )
  }

  /**
   * Get video by ID
   */
  static async getVideoById(videoId: string, userId?: string): Promise<UserVideo | null> {
    try {
      let query = supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('*')
        .eq('id', videoId)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: video, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error getting video:', error)
        handleSupabaseError(error)
      }

      return video as UserVideo
    } catch (error) {
      console.error('Get video by ID error:', error)
      return null
    }
  }

  /**
   * Get video by Wavespeed request ID
   */
  static async getVideoByWavespeedId(
    wavespeedRequestId: string,
    userId?: string
  ): Promise<UserVideo | null> {
    try {
      let query = supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('*')
        .eq('wavespeed_request_id', wavespeedRequestId)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: video, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error getting video by Wavespeed ID:', error)
        handleSupabaseError(error)
      }

      return video as UserVideo
    } catch (error) {
      console.error('Get video by Wavespeed ID error:', error)
      return null
    }
  }

  /**
   * Get user's videos with pagination
   */
  static async getUserVideos(
    userId: string,
    options: {
      page?: number
      limit?: number
      status?: UserVideo['status'][]
      orderBy?: 'created_at' | 'updated_at'
      orderDirection?: 'asc' | 'desc'
      search?: string
    } = {}
  ): Promise<{
    videos: UserVideo[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }> {
    return resilientDbOperation(
      async () => {
        const {
          page = 1,
          limit = 20,
          status,
          orderBy = 'created_at',
          orderDirection = 'desc',
          search
        } = options

        let query = supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .neq('status', 'deleted') // Exclude soft-deleted videos

        // Filter by status
        if (status && status.length > 0) {
          query = query.in('status', status)
        }

        // Search in prompt
        if (search) {
          query = query.ilike('prompt', `%${search}%`)
        }

        // Ordering
        query = query.order(orderBy, { ascending: orderDirection === 'asc' })

        // Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data: videos, error, count } = await query

        if (error) {
          console.error('Error getting user videos:', error)
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.getUserVideos')
          handleSupabaseError(error)
        }

        const total = count || 0
        const hasMore = to < total - 1

        return {
          videos: videos as UserVideo[],
          total,
          page,
          limit,
          hasMore
        }
      },
      `Get user videos (${userId})`
    )
  }

  /**
   * Get user's video statistics
   */
  static async getUserVideoStats(userId: string): Promise<{
    total: number
    completed: number
    processing: number
    failed: number
    totalSizeMB: number
  }> {
    try {
      const { data: stats, error } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('status, file_size')
        .eq('user_id', userId)
        .neq('status', 'deleted')

      if (error) {
        console.error('Error getting user video stats:', error)
        handleSupabaseError(error)
      }

      const total = stats.length
      const completed = stats.filter(v => v.status === 'completed').length
      const processing = stats.filter(v => ['generating', 'downloading', 'processing'].includes(v.status)).length
      const failed = stats.filter(v => v.status === 'failed').length
      const totalSize = stats.reduce((sum, v) => sum + (v.file_size || 0), 0)
      const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100

      return {
        total,
        completed,
        processing,
        failed,
        totalSizeMB
      }
    } catch (error) {
      console.error('Get user video stats error:', error)
      throw error
    }
  }

  /**
   * Update video interaction (view count, last viewed)
   */
  static async recordVideoView(videoId: string, userId: string): Promise<void> {
    // 🔥 修复：检查参数有效性，避免空值
    if (!videoId || !userId) {
      console.warn('Invalid parameters for recordVideoView:', { videoId, userId })
      return
    }

    try {
      await resilientDbOperation(
        async () => {
          // First get current view count
          const { data: video, error: fetchError } = await supabaseAdmin
            .from(TABLES.USER_VIDEOS)
            .select('view_count')
            .eq('id', videoId)
            .eq('user_id', userId)
            .single()

          // 🔥 修复：如果视频不存在，静默返回（视频可能还未存储到数据库）
          if (fetchError || !video) {
            console.log(`Video not found in database: ${videoId}`)
            return
          }

          const currentViewCount = video?.view_count || 0

          const { error } = await supabaseAdmin
            .from(TABLES.USER_VIDEOS)
            .update({
              view_count: currentViewCount + 1,
              last_viewed_at: new Date().toISOString()
            })
            .eq('id', videoId)
            .eq('user_id', userId)

          if (error) {
            ErrorReporter.getInstance().reportError(error, 'UserVideosDB.recordVideoView')
            throw error
          }
        },
        `Record video view (${videoId})`,
      )
    } catch (error) {
      // Don't throw error for view tracking failures, just log
      console.log('Record video view skipped:', error)
    }
  }

  /**
   * Toggle video favorite status
   */
  static async toggleVideoFavorite(videoId: string, userId: string): Promise<boolean> {
    return resilientDbOperation(
      async () => {
        // First get current status
        const video = await this.getVideoById(videoId, userId)
        if (!video) {
          throw new Error('Video not found')
        }

        const newFavoriteStatus = !video.is_favorite

        const { error } = await supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', videoId)
          .eq('user_id', userId)

        if (error) {
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.toggleVideoFavorite')
          handleSupabaseError(error)
        }

        return newFavoriteStatus
      },
      `Toggle video favorite (${videoId})`
    )
  }

  /**
   * Soft delete a video
   */
  static async deleteVideo(videoId: string, userId: string): Promise<void> {
    return resilientDbOperation(
      async () => {
        const { error } = await supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .update({ status: 'deleted' })
          .eq('id', videoId)
          .eq('user_id', userId)

        if (error) {
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.deleteVideo')
          handleSupabaseError(error)
        }

        console.log(`Video soft deleted: ${videoId}`)
      },
      `Delete video (${videoId})`
    )
  }

  /**
   * Get user's storage quota information
   */
  static async getUserQuota(userId: string): Promise<UserQuotaInfo> {
    return resilientDbOperation(
      async () => {
        const { data: quota, error } = await supabaseAdmin
          .rpc('get_user_quota', { user_uuid: userId })
          .single()

        if (error) {
          console.error('Error getting user quota:', error)
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.getUserQuota')
          handleSupabaseError(error)
        }

        return quota as UserQuotaInfo
      },
      `Get user quota (${userId})`
    )
  }

  /**
   * Check if user can upload a new video
   */
  static async canUserUpload(userId: string, estimatedSize: number = 0): Promise<boolean> {
    try {
      const { data: canUpload, error } = await supabaseAdmin
        .rpc('can_user_upload_video', {
          user_uuid: userId,
          estimated_size: estimatedSize
        })

      if (error) {
        console.error('Error checking upload permission:', error)
        return false
      }

      return canUpload
    } catch (error) {
      console.error('Can user upload error:', error)
      return false
    }
  }

  /**
   * Get videos by status for admin purposes
   */
  static async getVideosByStatus(
    status: UserVideo['status'],
    limit: number = 100
  ): Promise<UserVideo[]> {
    try {
      const { data: videos, error } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error getting videos by status:', error)
        handleSupabaseError(error)
      }

      return videos as UserVideo[]
    } catch (error) {
      console.error('Get videos by status error:', error)
      throw error
    }
  }
}
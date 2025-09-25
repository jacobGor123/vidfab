/**
 * User Videos Database Operations
 * VidFab AI Video Platform
 */

import { supabase, supabaseAdmin, TABLES, handleSupabaseError } from '../supabase'
import type { UserVideo, UserStorageQuota, UserQuotaInfo } from '../supabase'
import { resilientDbOperation, ErrorReporter } from '@/lib/utils/error-handling'

export class UserVideosDB {

  // Cache quota info to prevent excessive database calls
  private static quotaCache = new Map<string, { data: UserQuotaInfo; timestamp: number }>()
  private static readonly QUOTA_CACHE_TTL = 30000 // 30 seconds cache

  /**
   * Create a new video record
   * 🔥 修复：自动处理用户不存在的情况
   */
  static async createVideo(
    userId: string,
    data: {
      wavespeedRequestId: string
      prompt: string
      settings: UserVideo['settings']
      originalUrl?: string
    },
    userEmail?: string
  ): Promise<UserVideo> {
    return resilientDbOperation(
      async () => {
        try {
          console.log(`🎬 尝试直接创建视频: ${data.wavespeedRequestId} for user ${userId}`)

          // 🔥 直接尝试创建视频
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

          if (!error) {
            console.log(`✅ 视频直接创建成功: ${video.id}`)
            return video as UserVideo
          }

          console.log(`⚠️ 直接创建失败，错误码: ${error.code}`)

          // 🔥 如果是外键约束错误，使用强制方法直接解决
          if (error.code === '23503' && error.message.includes('user_videos_user_id_fkey')) {
            console.log(`🔧 外键约束错误，启动用户创建流程`)
            return await this.forceCreateUserAndVideo(userId, userEmail, data)
          }

          // 其他错误直接抛出
          console.error('Error creating video:', error)
          ErrorReporter.getInstance().reportError(error, 'UserVideosDB.createVideo')
          handleSupabaseError(error)

        } catch (err) {
          console.error('UserVideosDB.createVideo exception:', err)
          throw err
        }
      },
      'Create video'
    )
  }

  /**
   * 🔥 简化的用户和视频创建方法 - 使用原子操作
   */
  private static async forceCreateUserAndVideo(
    userId: string,
    userEmail: string | undefined,
    data: {
      wavespeedRequestId: string
      prompt: string
      settings: any
      originalUrl?: string
    }
  ): Promise<UserVideo> {
    console.log(`🔥 开始强制创建用户和视频: ${userId}, ${userEmail}`)

    try {
      // 🔥 方案1：先检查用户是否存在
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('uuid, email')
        .eq('uuid', userId)
        .maybeSingle()

      if (checkError) {
        console.error(`❌ Error checking existing user:`, checkError)
      }

      if (!existingUser) {
        console.log(`👤 用户不存在，创建新用户: ${userId}`)

        // 🔥 生成唯一的email来避免冲突 - 使用完整UUID确保唯一性
        const uniqueEmail = userEmail || `${userId}@vidfab.ai`

        const { data: userData, error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            uuid: userId,
            email: uniqueEmail,
            nickname: userEmail?.split('@')[0] || `User${userId.split('-')[0]}`,
            avatar_url: '',
            signin_type: 'oauth',
            signin_provider: 'google',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_verified: true,
            is_active: true
          })
          .select()

        if (insertError) {
          if (insertError.code === '23505') {
            // 如果还是有唯一约束冲突，尝试用UUID作为email
            console.warn(`⚠️ Email冲突，使用UUID作为email重试`)
            const { data: retryData, error: retryError } = await supabaseAdmin
              .from('users')
              .insert({
                uuid: userId,
                email: `${userId}@vidfab.ai`,
                nickname: `User${userId.split('-')[0]}`,
                avatar_url: '',
                signin_type: 'oauth',
                signin_provider: 'google',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                email_verified: true,
                is_active: true
              })
              .select()

            if (retryError) {
              console.error(`❌ 重试用户创建失败:`, retryError)
              // 继续，不抛错
            } else {
              console.log(`✅ 用户创建成功(重试): ${userId}`)
            }
          } else {
            console.error(`❌ User creation failed:`, insertError)
          }
        } else {
          console.log(`✅ 用户创建成功: ${userId}`)
        }
      } else {
        console.log(`✅ 用户已存在: ${userId}, email: ${existingUser.email}`)
      }

      // 🔥 方案2：直接等待一小段时间确保事务提交
      await new Promise(resolve => setTimeout(resolve, 100))

      // 🔥 方案3：再次验证用户存在后创建视频
      const { data: finalUser, error: finalCheckError } = await supabaseAdmin
        .from('users')
        .select('uuid')
        .eq('uuid', userId)
        .maybeSingle()

      if (finalCheckError || !finalUser) {
        console.error(`❌ 最终用户验证失败，无法创建视频: ${userId}`)
        throw new Error(`User ${userId} still not found after creation attempts`)
      }

      // 🔥 用户确认存在，创建视频记录
      const { data: video, error: videoError } = await supabaseAdmin
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

      if (videoError) {
        console.error(`❌ 视频创建失败:`, videoError)

        if (videoError.code === '23503') {
          console.error(`❌ 外键约束仍然失败，这不应该发生。用户存在但视频创建失败。`)
          // 🔥 最后尝试：再等待一下再创建视频
          await new Promise(resolve => setTimeout(resolve, 500))

          const { data: retryVideo, error: retryError } = await supabaseAdmin
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

          if (retryError) {
            console.error(`❌ 重试视频创建也失败，现在才创建临时记录:`, retryError)
            // 🔥 只有在所有尝试都失败后才创建临时记录
            return {
              id: `temp-${Date.now()}`,
              user_id: userId,
              wavespeed_request_id: data.wavespeedRequestId,
              prompt: data.prompt,
              settings: data.settings,
              original_url: data.originalUrl,
              status: 'generating',
              download_progress: 0,
              error_message: null,
              storage_path: null,
              thumbnail_path: null,
              file_size: null,
              duration_seconds: null,
              view_count: 0,
              is_favorite: false,
              last_viewed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as UserVideo
          }

          console.log(`✅ 重试视频创建成功: ${retryVideo.id}`)
          return retryVideo as UserVideo
        }

        throw videoError
      }

      console.log(`✅ 视频创建成功: ${video.id}`)
      return video as UserVideo

    } catch (error) {
      console.error('❌ forceCreateUserAndVideo final error:', error)

      // 🔥 最终降级方案：创建临时记录，不依赖数据库
      console.log('🔄 创建临时视频记录作为降级方案')
      return {
        id: `temp-${Date.now()}`,
        user_id: userId,
        wavespeed_request_id: data.wavespeedRequestId,
        prompt: data.prompt,
        settings: data.settings,
        original_url: data.originalUrl,
        status: 'generating',
        download_progress: 0,
        error_message: null,
        storage_path: null,
        thumbnail_path: null,
        file_size: null,
        duration_seconds: null,
        view_count: 0,
        is_favorite: false,
        last_viewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserVideo
    }
  }

  /**
   * Update video status and progress
   * 🔥 修复：优雅处理临时视频记录
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
    // 🔥 如果是临时视频ID，直接返回模拟结果，不进行数据库操作
    if (videoId.startsWith('temp-')) {
      console.log(`🔄 跳过临时视频状态更新: ${videoId}`)
      return {
        id: videoId,
        user_id: '', // 这里无法获取，但临时记录通常不需要
        wavespeed_request_id: '',
        prompt: 'Temporary video',
        settings: {},
        original_url: null,
        status: updates.status || 'completed',
        download_progress: updates.downloadProgress || 100,
        error_message: updates.errorMessage || null,
        storage_path: updates.storagePath || null,
        thumbnail_path: updates.thumbnailPath || null,
        file_size: updates.fileSize || null,
        duration_seconds: updates.durationSeconds || null,
        view_count: 0,
        is_favorite: false,
        last_viewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserVideo
    }

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

      },
      `Delete video (${videoId})`
    )
  }

  /**
   * Get user's storage quota information
   */
  static async getUserQuota(userId: string): Promise<UserQuotaInfo> {
    try {
      // Check cache first
      const cached = this.quotaCache.get(userId)
      if (cached && Date.now() - cached.timestamp < this.QUOTA_CACHE_TTL) {
        return cached.data
      }

      // 尝试调用数据库函数
      const { data: quota, error } = await supabaseAdmin
        .rpc('get_user_quota', { user_uuid: userId })
        .single()

      const defaultQuota: UserQuotaInfo = {
        current_videos: 0,
        max_videos: 50,
        current_size_bytes: 0,
        max_size_bytes: 104857600, // 100MB
        current_size_mb: 0,
        max_size_mb: 100,
        videos_percentage: 0,
        storage_percentage: 0,
        can_upload: true,
        is_subscribed: false
      }

      if (error) {
        // Don't log warnings for common 401/403 errors to prevent spam
        if (!error.message.includes('401') && !error.message.includes('Unauthorized') && !error.message.includes('403')) {
          console.warn('Database quota function not available, using fallback:', error.message)
        }
        // Cache the default quota to prevent repeated calls
        this.quotaCache.set(userId, { data: defaultQuota, timestamp: Date.now() })
        return defaultQuota
      }

      const quotaData = quota as UserQuotaInfo
      // Cache the successful result
      this.quotaCache.set(userId, { data: quotaData, timestamp: Date.now() })
      return quotaData
    } catch (error) {
      const defaultQuota: UserQuotaInfo = {
        current_videos: 0,
        max_videos: 50,
        current_size_bytes: 0,
        max_size_bytes: 104857600, // 100MB
        current_size_mb: 0,
        max_size_mb: 100,
        videos_percentage: 0,
        storage_percentage: 0,
        can_upload: true,
        is_subscribed: false
      }

      // Don't log errors for common auth failures to prevent spam
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message
        if (!errorMessage.includes('401') && !errorMessage.includes('Unauthorized') && !errorMessage.includes('403')) {
          console.warn('getUserQuota fallback mode:', error)
        }
      }

      // Cache the default quota to prevent repeated calls
      this.quotaCache.set(userId, { data: defaultQuota, timestamp: Date.now() })
      return defaultQuota
    }
  }

  /**
   * Manual cleanup of user storage space
   */
  static async cleanupUserStorage(userId: string, targetSizeMB?: number): Promise<{
    deletedVideos: number
    freedSizeMB: number
    remainingSizeMB: number
  }> {
    try {
      // 尝试调用数据库函数
      const { data: result, error } = await supabaseAdmin
        .rpc('manual_cleanup_user_storage', {
          user_uuid: userId,
          target_size_mb: targetSizeMB
        })
        .single()

      if (error) {
        console.warn('Database cleanup function not available, using basic fallback:', error.message)
        // 基础清理：删除最旧的非收藏视频
        return await this.basicCleanupFallback(userId, targetSizeMB)
      }

      return {
        deletedVideos: result.deleted_videos,
        freedSizeMB: result.freed_size_mb,
        remainingSizeMB: result.remaining_size_mb
      }
    } catch (error) {
      console.warn('cleanupUserStorage fallback mode:', error)
      return await this.basicCleanupFallback(userId, targetSizeMB)
    }
  }

  /**
   * Basic cleanup fallback when database functions are not available
   */
  private static async basicCleanupFallback(userId: string, targetSizeMB?: number): Promise<{
    deletedVideos: number
    freedSizeMB: number
    remainingSizeMB: number
  }> {
    try {
      // 获取用户的旧视频（非收藏）
      const { data: videos, error } = await supabaseAdmin
        .from(TABLES.USER_VIDEOS)
        .select('id, file_size')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .eq('is_favorite', false)
        .order('created_at', { ascending: true })
        .limit(5) // 最多删除5个视频

      if (error) {
        console.error('Error in basic cleanup:', error)
        return { deletedVideos: 0, freedSizeMB: 0, remainingSizeMB: 0 }
      }

      let deletedCount = 0
      let freedBytes = 0

      // 删除最旧的几个视频
      for (const video of videos || []) {
        const { error: deleteError } = await supabaseAdmin
          .from(TABLES.USER_VIDEOS)
          .update({ status: 'deleted' })
          .eq('id', video.id)

        if (!deleteError) {
          deletedCount++
          freedBytes += video.file_size || 0
        }
      }

      return {
        deletedVideos: deletedCount,
        freedSizeMB: Math.round(freedBytes / (1024 * 1024) * 100) / 100,
        remainingSizeMB: 0 // 无法计算准确值
      }
    } catch (error) {
      console.error('Basic cleanup fallback failed:', error)
      return { deletedVideos: 0, freedSizeMB: 0, remainingSizeMB: 0 }
    }
  }

  /**
   * Check if user has exceeded storage quota
   */
  static async isStorageExceeded(userId: string): Promise<boolean> {
    try {
      const quota = await this.getUserQuota(userId)
      return quota.storage_percentage > 100
    } catch (error) {
      console.warn('Error checking storage status, assuming within limits:', error)
      return false
    }
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
        console.warn('Database upload check function not available, using basic check:', error.message)
        // 基础检查：假设用户可以上传，除非文件过大
        const maxFileSize = 100 * 1024 * 1024 // 100MB
        return estimatedSize <= maxFileSize
      }

      return canUpload
    } catch (error) {
      console.warn('Can user upload fallback mode:', error)
      // 基础检查：假设用户可以上传，除非文件过大
      const maxFileSize = 100 * 1024 * 1024 // 100MB
      return estimatedSize <= maxFileSize
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
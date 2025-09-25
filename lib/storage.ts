/**
 * Supabase Storage Configuration for Video Files
 * VidFab AI Video Platform
 */

import { supabase, supabaseAdmin } from './supabase'

// Storage bucket configuration
export const STORAGE_CONFIG = {
  buckets: {
    videos: 'user-videos',
    thumbnails: 'video-thumbnails',
    images: 'user-images', // 新增图片存储bucket
  },

  // File size limits
  limits: {
    maxVideoSize: 500 * 1024 * 1024, // 500MB per video
    maxThumbnailSize: 5 * 1024 * 1024, // 5MB per thumbnail
    maxImageSize: 10 * 1024 * 1024, // 10MB per image for image-to-video
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },

  // Path generators
  paths: {
    getVideoPath: (userId: string, videoId: string) =>
      `videos/${userId}/${videoId}.mp4`,
    getThumbnailPath: (userId: string, videoId: string) =>
      `thumbnails/${userId}/${videoId}.jpg`,
    getImagePath: (userId: string, imageId: string, extension: string = 'jpg') =>
      `images/${userId}/${imageId}.${extension}`,
    getUserFolder: (userId: string) => `videos/${userId}`,
    getUserImagesFolder: (userId: string) => `images/${userId}`,
  },

  // CDN and transformation settings
  cdn: {
    transform: {
      thumbnail: {
        width: 1280,
        height: 720,
        quality: 80,
        format: 'jpg' as const,
      },
      preview: {
        width: 640,
        height: 360,
        quality: 70,
        format: 'jpg' as const,
      }
    }
  }
} as const

// Storage bucket policies SQL
export const STORAGE_POLICIES = {
  // User videos bucket policies
  userVideosSelect: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-videos-select-policy',
      'user-videos',
      'SELECT',
      'bucket_id = ''user-videos'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  userVideosInsert: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-videos-insert-policy',
      'user-videos',
      'INSERT',
      'bucket_id = ''user-videos'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  userVideosUpdate: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-videos-update-policy',
      'user-videos',
      'UPDATE',
      'bucket_id = ''user-videos'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  userVideosDelete: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-videos-delete-policy',
      'user-videos',
      'DELETE',
      'bucket_id = ''user-videos'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  // Thumbnails bucket policies
  thumbnailsSelect: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'video-thumbnails-select-policy',
      'video-thumbnails',
      'SELECT',
      'bucket_id = ''video-thumbnails'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  thumbnailsInsert: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'video-thumbnails-insert-policy',
      'video-thumbnails',
      'INSERT',
      'bucket_id = ''video-thumbnails'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  thumbnailsUpdate: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'video-thumbnails-update-policy',
      'video-thumbnails',
      'UPDATE',
      'bucket_id = ''video-thumbnails'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  thumbnailsDelete: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'video-thumbnails-delete-policy',
      'video-thumbnails',
      'DELETE',
      'bucket_id = ''video-thumbnails'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  // Images bucket policies for image-to-video feature
  imagesSelect: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-images-select-policy',
      'user-images',
      'SELECT',
      'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  imagesInsert: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-images-insert-policy',
      'user-images',
      'INSERT',
      'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  imagesUpdate: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-images-update-policy',
      'user-images',
      'UPDATE',
      'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `,

  imagesDelete: `
    INSERT INTO storage.policies (id, bucket_id, command, definition)
    VALUES (
      'user-images-delete-policy',
      'user-images',
      'DELETE',
      'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]'
    );
  `
}

// Utility functions for storage operations
export class VideoStorageManager {

  /**
   * Get public URL for a video file
   */
  static getVideoUrl(userId: string, videoId: string): string {
    const path = STORAGE_CONFIG.paths.getVideoPath(userId, videoId)
    const { data } = supabase.storage
      .from(STORAGE_CONFIG.buckets.videos)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Get public URL for a thumbnail
   */
  static getThumbnailUrl(userId: string, videoId: string, transform?: 'thumbnail' | 'preview'): string {
    const path = STORAGE_CONFIG.paths.getThumbnailPath(userId, videoId)
    const { data } = supabase.storage
      .from(STORAGE_CONFIG.buckets.thumbnails)
      .getPublicUrl(path)

    // Apply transformations if specified
    if (transform && STORAGE_CONFIG.cdn.transform[transform]) {
      const { width, height, quality, format } = STORAGE_CONFIG.cdn.transform[transform]
      return `${data.publicUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`
    }

    return data.publicUrl
  }

  /**
   * Get public URL for an image
   */
  static getImageUrl(userId: string, imageId: string, extension: string = 'jpg'): string {
    const path = STORAGE_CONFIG.paths.getImagePath(userId, imageId, extension)
    const { data } = supabase.storage
      .from(STORAGE_CONFIG.buckets.images)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Upload video file to storage
   */
  static async uploadVideo(
    userId: string,
    videoId: string,
    file: File | Buffer,
    contentType: string = 'video/mp4'
  ) {
    const path = STORAGE_CONFIG.paths.getVideoPath(userId, videoId)

    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length
    if (fileSize > STORAGE_CONFIG.limits.maxVideoSize) {
      throw new Error(`Video file too large. Maximum size: ${STORAGE_CONFIG.limits.maxVideoSize / (1024 * 1024)}MB`)
    }

    // Validate content type
    if (!STORAGE_CONFIG.limits.allowedVideoTypes.includes(contentType)) {
      throw new Error(`Unsupported video format: ${contentType}`)
    }

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.videos)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      })

    if (error) {
      console.error('Video upload error:', error)
      throw new Error(`Failed to upload video: ${error.message}`)
    }

    return {
      path: data.path,
      url: this.getVideoUrl(userId, videoId)
    }
  }

  /**
   * Upload thumbnail to storage
   */
  static async uploadThumbnail(
    userId: string,
    videoId: string,
    file: File | Buffer,
    contentType: string = 'image/jpeg'
  ) {
    const path = STORAGE_CONFIG.paths.getThumbnailPath(userId, videoId)

    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length
    if (fileSize > STORAGE_CONFIG.limits.maxThumbnailSize) {
      throw new Error(`Thumbnail too large. Maximum size: ${STORAGE_CONFIG.limits.maxThumbnailSize / (1024 * 1024)}MB`)
    }

    // Validate content type
    if (!STORAGE_CONFIG.limits.allowedImageTypes.includes(contentType)) {
      throw new Error(`Unsupported image format: ${contentType}`)
    }

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.thumbnails)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      })

    if (error) {
      console.error('Thumbnail upload error:', error)
      throw new Error(`Failed to upload thumbnail: ${error.message}`)
    }

    return {
      path: data.path,
      url: this.getThumbnailUrl(userId, videoId)
    }
  }

  /**
   * Upload image for image-to-video feature
   */
  static async uploadImage(
    userId: string,
    imageId: string,
    file: File | Buffer,
    contentType?: string
  ): Promise<StorageUploadResult> {
    // Determine file extension from content type or file name
    let extension = 'jpg'
    if (contentType) {
      if (contentType.includes('png')) extension = 'png'
      else if (contentType.includes('webp')) extension = 'webp'
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg'
    } else if (file instanceof File) {
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.png')) extension = 'png'
      else if (fileName.endsWith('.webp')) extension = 'webp'
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) extension = 'jpg'
      contentType = file.type
    }

    const path = STORAGE_CONFIG.paths.getImagePath(userId, imageId, extension)

    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length
    if (fileSize > STORAGE_CONFIG.limits.maxImageSize) {
      throw new Error(`Image too large. Maximum size: ${STORAGE_CONFIG.limits.maxImageSize / (1024 * 1024)}MB`)
    }

    // Validate content type
    if (contentType && !STORAGE_CONFIG.limits.allowedImageTypes.includes(contentType)) {
      throw new Error(`Unsupported image format: ${contentType}`)
    }

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.images)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType || 'image/jpeg',
      })

    if (error) {
      console.error('Image upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    return {
      path: data.path,
      url: this.getImageUrl(userId, imageId, extension)
    }
  }

  /**
   * Delete video and thumbnail files
   */
  static async deleteVideo(userId: string, videoId: string) {
    const videoPath = STORAGE_CONFIG.paths.getVideoPath(userId, videoId)
    const thumbnailPath = STORAGE_CONFIG.paths.getThumbnailPath(userId, videoId)

    // Delete video file
    const { error: videoError } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.videos)
      .remove([videoPath])

    // Delete thumbnail (don't fail if thumbnail doesn't exist)
    const { error: thumbnailError } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.thumbnails)
      .remove([thumbnailPath])

    if (videoError) {
      console.error('Video deletion error:', videoError)
      throw new Error(`Failed to delete video: ${videoError.message}`)
    }

    if (thumbnailError) {
      console.warn('Thumbnail deletion warning:', thumbnailError)
      // Don't throw error for thumbnail deletion failures
    }

    return { success: true }
  }

  /**
   * Get user's storage usage
   */
  static async getUserStorageUsage(userId: string) {
    const folderPath = STORAGE_CONFIG.paths.getUserFolder(userId)

    const { data: files, error } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.videos)
      .list(folderPath.replace('/videos/', ''), {
        limit: 1000,
        offset: 0
      })

    if (error) {
      console.error('Storage usage query error:', error)
      return { totalSize: 0, fileCount: 0 }
    }

    const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
    const fileCount = files?.length || 0

    return {
      totalSize,
      fileCount,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
    }
  }

  /**
   * Upload blob to storage
   */
  static async uploadBlob(path: string, blob: Blob, contentType?: string) {
    try {
      const bucketName = path.startsWith('thumbnails/') ?
        STORAGE_CONFIG.buckets.thumbnails : STORAGE_CONFIG.buckets.videos

      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType || blob.type,
        })

      if (error) {
        throw new Error(`Failed to upload blob: ${error.message}`)
      }

      return { path: data.path }
    } catch (error) {
      console.error('Blob upload error:', error)
      throw error
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(path: string) {
    try {
      const bucketName = path.startsWith('thumbnails/') ?
        STORAGE_CONFIG.buckets.thumbnails : STORAGE_CONFIG.buckets.videos

      const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .remove([path])

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('File deletion error:', error)
      throw error
    }
  }

  /**
   * Get file information from storage
   */
  static async getFileInfo(path: string) {
    try {
      const bucketName = path.startsWith('thumbnails/') ?
        STORAGE_CONFIG.buckets.thumbnails : STORAGE_CONFIG.buckets.videos

      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .list('', {
          search: path.split('/').pop() || '',
          limit: 1
        })

      if (error) {
        throw new Error(`Failed to get file info: ${error.message}`)
      }

      const file = data.find(f => path.endsWith(f.name))
      if (!file) {
        return null
      }

      return {
        name: file.name,
        size: file.metadata?.size || 0,
        lastModified: file.created_at,
        contentType: file.metadata?.mimetype
      }
    } catch (error) {
      console.error('File info error:', error)
      return null
    }
  }

  /**
   * Get public URL for any storage path
   */
  static async getPublicUrl(path: string): Promise<string | null> {
    try {
      const bucketName = path.startsWith('thumbnails/') ?
        STORAGE_CONFIG.buckets.thumbnails : STORAGE_CONFIG.buckets.videos

      const { data } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(path)

      return data.publicUrl
    } catch (error) {
      console.error('Get public URL error:', error)
      return null
    }
  }

  /**
   * Download file from external URL and upload to storage
   * (Overloaded version for ResilientVideoProcessor)
   */
  static async downloadAndStore(
    externalUrl: string,
    storagePath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ path: string; size: number; url: string }> {
    try {

      // Download file from external URL
      const response = await fetch(externalUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      // Read the stream and track progress
      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Report progress
        if (onProgress && totalSize > 0) {
          const progress = Math.round((receivedLength / totalSize) * 100) / 100
          onProgress(progress)
        }
      }

      // Combine chunks into a single buffer
      const buffer = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        buffer.set(chunk, position)
        position += chunk.length
      }

      // Upload to Supabase Storage using blob upload
      const blob = new Blob([buffer], {
        type: response.headers.get('content-type') || 'video/mp4'
      })

      await this.uploadBlob(storagePath, blob)
      const publicUrl = await this.getPublicUrl(storagePath)


      return {
        path: storagePath,
        size: receivedLength,
        url: publicUrl || ''
      }

    } catch (error) {
      console.error('Download and store error:', error)
      throw error
    }
  }

  /**
   * Download file from external URL and upload to storage
   * (Original version for backward compatibility with userId/videoId parameters)
   */
  static async downloadAndStoreByUserVideo(
    userId: string,
    videoId: string,
    externalUrl: string,
    onProgress?: (progress: number) => void
  ) {
    const storagePath = STORAGE_CONFIG.paths.getVideoPath(userId, videoId)
    const result = await this.downloadAndStore(externalUrl, storagePath, onProgress)

    return {
      path: result.path,
      url: result.url
    }
  }
}

// Types for storage operations
export interface StorageUploadResult {
  path: string
  url: string
}

export interface StorageUsage {
  totalSize: number
  fileCount: number
  totalSizeMB: number
}
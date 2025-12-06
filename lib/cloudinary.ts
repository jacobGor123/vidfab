/**
 * Cloudinary Configuration for VidFab AI Video Platform
 * Video processing, thumbnail generation, and CDN delivery
 */

import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
})

// Export configured cloudinary instance
export { cloudinary }

/**
 * Cloudinary Thumbnail Service
 * Replaces ffmpeg-based thumbnail generation
 */
export class CloudinaryThumbnailService {
  /**
   * Generate thumbnail URL from a video URL (no upload required)
   * This uses Cloudinary's fetch feature to generate thumbnails on-the-fly
   *
   * @param videoUrl - Public URL of the video (e.g., Supabase Storage URL)
   * @param options - Thumbnail generation options
   * @returns Thumbnail URL
   */
  static generateFromUrl(
    videoUrl: string,
    options: {
      width?: number
      height?: number
      timeOffset?: number // seconds
      quality?: number
      format?: 'jpg' | 'png' | 'webp'
    } = {}
  ): string {
    const {
      width = 640,
      height = 360,
      timeOffset = 2,
      quality = 80,
      format = 'jpg',
    } = options

    const thumbnailUrl = cloudinary.url(videoUrl, {
      resource_type: 'video',
      type: 'fetch',
      format,
      transformation: [
        {
          width,
          height,
          crop: 'fill',
          quality: quality === 80 ? 'auto' : quality,
          fetch_format: 'auto', // Auto-optimize format (WebP for supported browsers)
        },
        {
          start_offset: timeOffset.toString(), // Extract frame at this second
        },
      ],
    })

    return thumbnailUrl
  }

  /**
   * Upload video to Cloudinary and get video + thumbnail URLs
   * Use this when you want Cloudinary to host the video (costs more but faster CDN)
   *
   * @param videoBuffer - Video file buffer
   * @param publicId - Unique identifier for the video
   * @param folder - Cloudinary folder path
   */
  static async uploadVideo(
    videoBuffer: Buffer,
    publicId: string,
    folder: string = 'vidfab-videos'
  ): Promise<{
    videoUrl: string
    thumbnailUrl: string
    publicId: string
    duration: number
    format: string
  }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder,
          public_id: publicId,
          transformation: [
            {
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error)
            return
          }

          if (!result) {
            reject(new Error('No result from Cloudinary'))
            return
          }

          // Generate thumbnail URL
          const thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [
              {
                width: 640,
                height: 360,
                crop: 'fill',
                quality: 'auto',
              },
              {
                start_offset: '2',
              },
            ],
          })

          resolve({
            videoUrl: result.secure_url,
            thumbnailUrl,
            publicId: result.public_id,
            duration: result.duration || 0,
            format: result.format || 'mp4',
          })
        }
      )

      uploadStream.end(videoBuffer)
    })
  }

  /**
   * Delete a video from Cloudinary
   */
  static async deleteVideo(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
      })
      return result.result === 'ok'
    } catch (error) {
      console.error('Failed to delete video from Cloudinary:', error)
      return false
    }
  }

  /**
   * Get video info from Cloudinary
   */
  static async getVideoInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'video',
      })
      return result
    } catch (error) {
      console.error('Failed to get video info from Cloudinary:', error)
      return null
    }
  }
}

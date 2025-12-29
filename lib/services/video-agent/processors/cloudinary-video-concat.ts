/**
 * Cloudinary 视频拼接
 * 使用 Cloudinary 云端 API 拼接视频，替代 FFmpeg
 * 适用于 Vercel Serverless 环境
 */

import { cloudinary } from '@/lib/cloudinary'

/**
 * 使用 Cloudinary 拼接多个视频
 * @param videoUrls - 视频 URL 数组
 * @param projectId - 项目 ID（用于命名）
 * @returns 拼接后的视频 URL
 */
export async function concatenateVideosWithCloudinary(
  videoUrls: string[],
  projectId: string
): Promise<string> {
  console.log('[CloudinaryConcat] 🎬 开始拼接视频', {
    videoCount: videoUrls.length,
    projectId
  })

  if (videoUrls.length === 0) {
    throw new Error('No videos to concatenate')
  }

  if (videoUrls.length === 1) {
    console.log('[CloudinaryConcat] ✅ 只有一个视频，直接返回')
    return videoUrls[0]
  }

  try {
    // 步骤 1: 上传所有视频到 Cloudinary
    console.log('[CloudinaryConcat] 📤 上传视频到 Cloudinary...')
    const uploadedPublicIds: string[] = []

    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i]
      console.log(`[CloudinaryConcat] 📤 上传视频 ${i + 1}/${videoUrls.length}...`)

      // 使用 fetch upload 直接从 URL 上传
      const result = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        folder: `video-agent/${projectId}`,
        public_id: `clip_${i}`,
        overwrite: true
      })

      uploadedPublicIds.push(result.public_id)
      console.log(`[CloudinaryConcat] ✅ 视频 ${i + 1} 已上传:`, result.public_id)
    }

    // 步骤 2: 使用 Cloudinary 的 concatenate 转换拼接视频
    console.log('[CloudinaryConcat] 🔗 拼接视频片段...')

    const basePublicId = uploadedPublicIds[0]
    const overlayTransformations = uploadedPublicIds.slice(1).map(publicId => ({
      overlay: {
        resource_type: 'video',
        public_id: publicId
      },
      flags: 'splice,layer_apply'
    }))

    // 使用 explicit API 生成拼接后的视频
    const result = await cloudinary.uploader.explicit(basePublicId, {
      resource_type: 'video',
      type: 'upload',
      eager: [
        {
          transformation: [
            ...overlayTransformations,
            {
              quality: 'auto:best',
              fetch_format: 'auto'
            }
          ],
          format: 'mp4'
        }
      ],
      eager_async: false // 同步生成
    })

    // 获取拼接后的视频 URL
    const concatenatedUrl = result.eager?.[0]?.secure_url || result.secure_url

    console.log('[CloudinaryConcat] ✅ 视频拼接完成:', concatenatedUrl)
    return concatenatedUrl

  } catch (error: any) {
    console.error('[CloudinaryConcat] ❌ 视频拼接失败:', error.message)
    throw new Error(`Failed to concatenate videos: ${error.message}`)
  }
}

/**
 * 添加音频到视频（使用 Cloudinary）
 * @param videoUrl - 视频 URL
 * @param audioUrl - 音频 URL
 * @param projectId - 项目 ID
 * @returns 合成后的视频 URL
 */
export async function addAudioToVideoWithCloudinary(
  videoUrl: string,
  audioUrl: string,
  projectId: string,
  options: {
    volume?: number
  } = {}
): Promise<string> {
  console.log('[CloudinaryConcat] 🎵 添加音频到视频...')

  try {
    // 上传视频
    const videoResult = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      folder: `video-agent/${projectId}`,
      public_id: 'video_with_audio',
      overwrite: true
    })

    // 上传音频
    const audioResult = await cloudinary.uploader.upload(audioUrl, {
      resource_type: 'video', // Cloudinary 将音频也作为 video 类型处理
      folder: `video-agent/${projectId}`,
      public_id: 'audio_track',
      overwrite: true
    })

    // 使用 Cloudinary 叠加音频
    const result = await cloudinary.uploader.explicit(videoResult.public_id, {
      resource_type: 'video',
      type: 'upload',
      eager: [
        {
          transformation: [
            {
              overlay: {
                resource_type: 'video',
                public_id: audioResult.public_id
              },
              flags: 'layer_apply,splice',
              ...(options.volume && { effect: `volume:${Math.round(options.volume * 100)}` })
            }
          ],
          format: 'mp4'
        }
      ],
      eager_async: false
    })

    const resultUrl = result.eager?.[0]?.secure_url || result.secure_url
    console.log('[CloudinaryConcat] ✅ 音频添加完成:', resultUrl)
    return resultUrl

  } catch (error: any) {
    console.error('[CloudinaryConcat] ❌ 添加音频失败:', error.message)
    throw new Error(`Failed to add audio: ${error.message}`)
  }
}

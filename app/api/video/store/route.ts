/**
 * Video Storage API
 * Downloads and stores completed videos from Wavespeed to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { UserVideosDB } from '@/lib/database/user-videos'
import { supabaseAdmin } from '@/lib/supabase'
import { extractVideoThumbnail } from '@/lib/discover/extract-thumbnail'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check for internal call (contains userId parameter)
    if (body.userId) {
      // 内部调用，直接使用传递的userId，跳过session验证
      const userId = body.userId
      const userEmail = body.userEmail || 'internal@vidfab.ai'

      // Validate request body
      const { wavespeedRequestId, originalUrl, settings } = body
      if (!wavespeedRequestId || !originalUrl || !settings) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }


      return await processVideoStorage(userId, userEmail, { wavespeedRequestId, originalUrl, settings })
    }

    // 外部调用，需要session验证 - NextAuth 4.x
    const session = await getServerSession(authConfig)


    if (!session?.user?.uuid) {
      console.error('❌ Video store: Authentication failed', {
        session: !!session,
        user: !!session?.user,
        uuid: session?.user?.uuid
      })
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.uuid
    const userEmail = session.user.email

    // Validate request body
    const { wavespeedRequestId, originalUrl, settings } = body
    if (!wavespeedRequestId || !originalUrl || !settings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }


    return await processVideoStorage(userId, userEmail, { wavespeedRequestId, originalUrl, settings })

  } catch (error) {
    console.error('Video storage API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processVideoStorage(userId: string, userEmail: string, data: {
  wavespeedRequestId: string,
  originalUrl: string,
  settings: any
}) {
  const { wavespeedRequestId, originalUrl, settings } = data


  try {
    // 检查是否已存在
    let existingVideo = await UserVideosDB.getVideoByWavespeedId(wavespeedRequestId, userId)

    if (existingVideo) {
      await UserVideosDB.updateVideoStatus(existingVideo.id, {
        status: 'completed',
        downloadProgress: 100
      })

      return NextResponse.json({
        success: true,
        data: {
          videoId: existingVideo.id,
          status: 'completed',
          videoUrl: originalUrl,
          message: 'Video ready',
          userEmail
        }
      })
    }

    const newVideo = await UserVideosDB.createVideo(userId, {
      wavespeedRequestId,
      prompt: settings.prompt || 'Generated video',
      settings: {
        model: settings.model,
        duration: settings.duration,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio,
        style: settings.style,
        image_url: settings.image_url || settings.imageUrl || settings.image || null,
        effectId: settings.effectId || null,
        effectName: settings.effectName || null,
        generationType: settings.generationType || null
      },
      originalUrl
    }, userEmail)


    // Only update real database records, skip temporary records
    if (!newVideo.id.startsWith('temp-') && !newVideo.id.startsWith('00000000-0000-4000-8000-')) {
      // 获取文件大小
      let fileSize = null
      try {
        const response = await fetch(originalUrl, { method: 'HEAD' })
        if (response.ok) {
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            fileSize = parseInt(contentLength, 10)
          }
        }
      } catch (sizeError) {
        console.warn(`Failed to get file size: ${sizeError.message}`)
        fileSize = 10 * 1024 * 1024 // 默认 10MB
      }

      // 生成并上传缩略图
      let thumbnailPath: string | null = null
      try {
        const videoResponse = await fetch(originalUrl)
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())

        const thumbnailResult = await extractVideoThumbnail(videoBuffer, {
          timestamp: 0.1,
          format: 'webp',
          maxWidth: 1280,
          maxHeight: 720,
          quality: 85,
          targetSizeKB: 100
        })

        if (thumbnailResult.success && thumbnailResult.buffer) {
          const thumbnailFileName = `${userId}/${newVideo.id}-thumbnail.webp`
          const { error: uploadError } = await supabaseAdmin
            .storage
            .from('video-thumbnails')
            .upload(thumbnailFileName, thumbnailResult.buffer, {
              contentType: 'image/webp',
              upsert: true
            })

          if (uploadError) {
            console.error('Thumbnail upload failed:', uploadError)
          } else {
            thumbnailPath = thumbnailFileName
          }
        }
      } catch (thumbnailError) {
        console.error('Thumbnail generation failed:', thumbnailError)
      }

      // 更新视频状态
      try {
        await UserVideosDB.updateVideoStatus(newVideo.id, {
          status: 'completed',
          downloadProgress: 100,
          fileSize: fileSize,
          thumbnailPath: thumbnailPath
        })
      } catch (updateError) {
        console.error('Failed to update video status:', updateError)
      }
    }


    return NextResponse.json({
      success: true,
      data: {
        videoId: newVideo.id,
        status: 'completed',
        videoUrl: originalUrl,
        message: 'Video saved successfully',
        userEmail
      }
    })

  } catch (error) {
    console.error('Video storage failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save video',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get download progress for a specific video
    const url = new URL(request.url)
    const videoId = url.searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID required' },
        { status: 400 }
      )
    }

    // Verify user authentication
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Query user_videos table
    const video = await UserVideosDB.getVideoById(videoId, session.user.uuid)

    if (!video) {
      // If video not found, return default completed status
      return NextResponse.json({
        success: true,
        data: {
          videoId,
          status: 'completed',
          progress: 100,
          error: null,
          estimatedTimeRemaining: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }

    // Calculate estimated time remaining based on progress
    let estimatedTimeRemaining
    if (video.download_progress > 0 && video.download_progress < 100) {
      const startTime = new Date(video.created_at).getTime()
      const currentTime = Date.now()
      const elapsedMinutes = (currentTime - startTime) / 60000
      const progressRate = video.download_progress / elapsedMinutes
      const remainingProgress = 100 - video.download_progress
      estimatedTimeRemaining = Math.round(remainingProgress / progressRate)
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: video.id,
        status: video.status,
        progress: video.download_progress,
        error: video.error_message,
        estimatedTimeRemaining,
        createdAt: video.created_at,
        updatedAt: video.updated_at
      }
    })

  } catch (error) {
    console.error('Get download progress error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
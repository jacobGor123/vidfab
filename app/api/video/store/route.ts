/**
 * Video Storage API
 * Downloads and stores completed videos from Wavespeed to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { UserVideosDB } from '@/lib/database/user-videos'
import { supabaseAdmin } from '@/lib/supabase'
import { VideoStorageManager } from '@/lib/storage'  // 🔥 新增: 用于上传视频到 Supabase Storage
// import { extractVideoThumbnail } from '@/lib/discover/extract-thumbnail' // 已禁用: Vercel 无 ffmpeg

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check for internal call (contains userId parameter)
    if (body.userId) {
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

    const session = await getServerSession(authConfig)

    if (!session?.user?.uuid) {
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
      if (existingVideo.status === 'completed' && existingVideo.storage_path) {
        return NextResponse.json({
          success: true,
          data: {
            videoId: existingVideo.id,
            status: 'completed',
            videoUrl: existingVideo.original_url,
            storagePath: existingVideo.storage_path,
            message: 'Video already stored',
            userEmail
          }
        })
      }

      await UserVideosDB.updateVideoStatus(existingVideo.id, {
        status: 'completed',
        downloadProgress: 100,
        originalUrl: originalUrl
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

    let supabaseVideoUrl: string | null = null
    let storagePath: string | null = null
    let fileSize: number | null = null

    try {
      const videoResponse = await fetch(originalUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
      fileSize = videoBuffer.length

      // 确定视频格式
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4'

      const videoId = wavespeedRequestId.replace(/[^a-zA-Z0-9]/g, '_')

      const uploadResult = await VideoStorageManager.uploadVideo(
        userId,
        videoId,
        videoBuffer,
        contentType
      )

      supabaseVideoUrl = uploadResult.url
      storagePath = uploadResult.path
    } catch (uploadError) {
      supabaseVideoUrl = null
      storagePath = null
      if (!fileSize) {
        try {
          const response = await fetch(originalUrl, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            fileSize = parseInt(contentLength, 10)
          }
        } catch (error) {
          // Ignore error
        }
      }
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
      originalUrl,
      storagePath
    }, userEmail)

    if (!newVideo.id.startsWith('temp-') && !newVideo.id.startsWith('00000000-0000-4000-8000-')) {
      let thumbnailPath: string | null = supabaseVideoUrl || originalUrl

      // 更新视频状态
      try {
        await UserVideosDB.updateVideoStatus(newVideo.id, {
          status: 'completed',
          downloadProgress: 100,
          fileSize: fileSize,
          thumbnailPath: thumbnailPath,
          storagePath: storagePath
        })
      } catch (updateError) {
        // Ignore error
      }
    }

    const isSupabaseStored = !!supabaseVideoUrl

    return NextResponse.json({
      success: true,
      data: {
        videoId: newVideo.id,
        status: 'completed',
        videoUrl: supabaseVideoUrl || originalUrl,
        storagePath: storagePath,
        fileSize: fileSize,
        uploadedToSupabase: isSupabaseStored,
        message: isSupabaseStored
          ? 'Video saved to Supabase Storage (permanent)'
          : 'Video metadata saved (using original URL)',
        userEmail
      }
    })

  } catch (error) {
    if (error instanceof Error && (error.message.includes('23505') || error.message.includes('duplicate key'))) {
      try {
        const existingVideo = await UserVideosDB.getVideoByWavespeedId(wavespeedRequestId, userId)
        if (existingVideo) {
          return NextResponse.json({
            success: true,
            data: {
              videoId: existingVideo.id,
              status: existingVideo.status,
              videoUrl: existingVideo.original_url || originalUrl,
              storagePath: existingVideo.storage_path,
              message: 'Video already exists (recovered from duplicate)',
              userEmail
            }
          })
        }
      } catch (recoveryError) {
        // Ignore error
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to save video',
      details: error instanceof Error ? error.message : String(error)
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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
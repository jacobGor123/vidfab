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

  console.log(`🎬 Processing video storage:`, {
    userId,
    wavespeedRequestId,
    originalUrl: originalUrl.substring(0, 50) + '...',
    model: settings.model,
    generationType: settings.generationType
  })

  try {
    // 检查是否已存在
    let existingVideo = await UserVideosDB.getVideoByWavespeedId(wavespeedRequestId, userId)

    if (existingVideo) {
      console.log(`✅ Video already exists: ${existingVideo.id}`)

      // 如果已完成且有永久存储，直接返回
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

      // 否则更新状态为已完成（但仍然只有临时URL，历史遗留问题）
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

    // 🔥 下载视频并上传到 Supabase Storage（永久存储）
    console.log(`💾 Downloading and uploading video to Supabase Storage...`)

    let supabaseVideoUrl: string | null = null
    let storagePath: string | null = null
    let fileSize: number | null = null

    try {
      // 下载视频
      console.log(`📥 Downloading video from: ${originalUrl.substring(0, 80)}...`)
      const videoResponse = await fetch(originalUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
      fileSize = videoBuffer.length
      console.log(`✅ Downloaded video: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`)

      // 确定视频格式
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4'

      // 生成唯一的视频ID（使用 wavespeedRequestId）
      const videoId = wavespeedRequestId.replace(/[^a-zA-Z0-9]/g, '_')

      // 上传到 Supabase Storage
      console.log(`📤 Uploading to Supabase Storage...`)
      const uploadResult = await VideoStorageManager.uploadVideo(
        userId,
        videoId,
        videoBuffer,
        contentType
      )

      supabaseVideoUrl = uploadResult.url
      storagePath = uploadResult.path
      console.log(`✅ Video uploaded to Supabase: ${storagePath}`)
    } catch (uploadError) {
      console.error(`⚠️ Failed to upload to Supabase Storage:`, uploadError)
      // 如果上传失败，回退到使用原始 URL
      supabaseVideoUrl = null
      storagePath = null
      // 仍然尝试获取文件大小
      if (!fileSize) {
        try {
          const response = await fetch(originalUrl, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            fileSize = parseInt(contentLength, 10)
          }
        } catch (error) {
          console.error(`❌ Failed to get file size:`, error)
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
      storagePath  // 🔥 新增: 永久存储路径
    }, userEmail)


    // Only update real database records, skip temporary records
    if (!newVideo.id.startsWith('temp-') && !newVideo.id.startsWith('00000000-0000-4000-8000-')) {
      // 🔄 缩略图策略: 使用永久视频 URL 或临时 URL 作为缩略图
      // 前端会使用 <video> 标签自动显示第一帧作为封面
      // TODO Phase 3: 集成 Supabase Edge Functions + ffmpeg 生成真实缩略图
      let thumbnailPath: string | null = supabaseVideoUrl || originalUrl

      console.log('ℹ️  Using video URL as thumbnail (browser renders first frame)')

      // 更新视频状态
      try {
        await UserVideosDB.updateVideoStatus(newVideo.id, {
          status: 'completed',
          downloadProgress: 100,
          fileSize: fileSize,
          thumbnailPath: thumbnailPath,
          storagePath: storagePath  // 🔥 新增: 保存永久存储路径
        })
      } catch (updateError) {
        console.error('Failed to update video status:', updateError)
      }
    }

    const isSupabaseStored = !!supabaseVideoUrl
    console.log(`✅ Video stored successfully: ${newVideo.id}`)
    console.log(`   - File size: ${fileSize ? (fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'unknown'}`)
    console.log(`   - Supabase Storage: ${isSupabaseStored ? '✅ Yes' : '⚠️ No (using original URL)'}`)
    if (storagePath) {
      console.log(`   - Storage path: ${storagePath}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: newVideo.id,
        status: 'completed',
        videoUrl: supabaseVideoUrl || originalUrl,  // 🔥 优先返回永久 URL
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
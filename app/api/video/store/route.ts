/**
 * Video Storage API
 * Downloads and stores completed videos from Wavespeed to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { UserVideosDB } from '@/lib/database/user-videos'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 🔥 检查是否是内部调用（包含userId参数）
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

// 🔥 极简化的视频存储处理逻辑 - 直接依赖UserVideosDB的内置用户创建
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

    // 🔥 直接创建视频，UserVideosDB会自动处理用户不存在的情况
    const newVideo = await UserVideosDB.createVideo(userId, {
      wavespeedRequestId,
      prompt: settings.prompt || 'Generated video',
      settings: {
        model: settings.model,
        duration: settings.duration,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio,
        style: settings.style
      },
      originalUrl
    }, userEmail) // 🔥 传递userEmail参数


    // 🔥 只更新真实数据库记录，跳过临时记录，并获取文件大小
    if (!newVideo.id.startsWith('temp-') && !newVideo.id.startsWith('00000000-0000-4000-8000-')) {
      // 获取文件大小
      let fileSize = null
      try {
        console.log(`📏 获取文件大小: ${originalUrl}`)
        const response = await fetch(originalUrl, { method: 'HEAD' })

        if (response.ok) {
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            fileSize = parseInt(contentLength, 10)
            console.log(`✅ 获取到文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
          }
        }
      } catch (sizeError) {
        console.warn(`⚠️ 无法获取文件大小: ${sizeError.message}`)
        // 使用估算值
        fileSize = 10 * 1024 * 1024 // 默认 10MB
        console.log(`📐 使用估算文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
      }

      // 立即标记为完成并设置文件大小
      try {
        await UserVideosDB.updateVideoStatus(newVideo.id, {
          status: 'completed',
          downloadProgress: 100,
          fileSize: fileSize
        })
        console.log(`✅ Video status updated to completed with file size: ${newVideo.id}, ${fileSize ? (fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}`)
      } catch (updateError) {
        console.error(`❌ Failed to update video status:`, updateError)
        // 不抛出错误，允许继续执行
      }
    } else {
      console.log(`🔄 跳过临时视频状态更新: ${newVideo.id}`)
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
    console.error('❌ Video storage failed:', error)
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
/**
 * Image Storage API
 * 下载并存储已完成的图片从 Wavespeed 到 Supabase Storage
 * 参考: /app/api/video/store/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 🔥 检查是否是内部调用（包含userId参数）
    if (body.userId) {
      // 内部调用，直接使用传递的userId，跳过session验证
      const userId = body.userId
      const userEmail = body.userEmail || 'internal@vidfab.ai'

      // 验证必需字段
      const { wavespeedRequestId, originalUrl, settings } = body
      if (!wavespeedRequestId || !originalUrl || !settings) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      console.log(`📸 [Internal] Starting image storage for user ${userId}`)
      return await processImageStorage(userId, userEmail, { wavespeedRequestId, originalUrl, settings })
    }

    // 外部调用，需要session验证
    const session = await getServerSession(authConfig)

    if (!session?.user?.uuid) {
      console.error('❌ Image store: Authentication failed', {
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

    // 验证必需字段
    const { wavespeedRequestId, originalUrl, settings } = body
    if (!wavespeedRequestId || !originalUrl || !settings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📸 Starting image storage for user ${userId}`)
    return await processImageStorage(userId, userEmail, { wavespeedRequestId, originalUrl, settings })

  } catch (error) {
    console.error('❌ Image storage API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 图片存储处理逻辑
 */
async function processImageStorage(userId: string, userEmail: string, data: {
  wavespeedRequestId: string,
  originalUrl: string,
  settings: any
}) {
  const { wavespeedRequestId, originalUrl, settings } = data

  console.log(`📸 Processing image storage:`, {
    userId,
    wavespeedRequestId,
    originalUrl: originalUrl.substring(0, 50) + '...',
    model: settings.model,
    generationType: settings.generationType
  })

  try {
    // 🔥 首先验证用户是否存在
    console.log(`🔍 [Image Store] Checking if user exists: ${userId}`)
    console.log(`🔍 [Image Store] TABLES.USERS = ${TABLES.USERS}`)

    const { data: user, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email')
      .eq('uuid', userId)
      .maybeSingle()

    console.log(`🔍 [Image Store] User check result:`, {
      found: !!user,
      error: userError?.message || null,
      userData: user
    })

    if (userError || !user) {
      console.error(`❌ User not found in database: ${userId}`, userError)
      return NextResponse.json({
        success: false,
        error: 'User not found',
        details: `User ${userId} does not exist in database. Please try logging out and logging in again.`
      }, { status: 400 })
    }

    console.log(`✅ [Image Store] User verified: ${user.email}`)

    // 检查是否已存在
    const { data: existingImages } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select('id, status, storage_url')
      .eq('wavespeed_request_id', wavespeedRequestId)
      .eq('user_id', userId)
      .limit(1)

    if (existingImages && existingImages.length > 0) {
      const existingImage = existingImages[0]
      console.log(`✅ Image already exists: ${existingImage.id}`)

      // 如果已完成，直接返回
      if (existingImage.status === 'completed' && existingImage.storage_url) {
        return NextResponse.json({
          success: true,
          data: {
            imageId: existingImage.id,
            status: 'completed',
            storageUrl: existingImage.storage_url,
            message: 'Image already stored',
            userEmail
          }
        })
      }

      // 否则更新状态为已完成
      await supabaseAdmin
        .from(TABLES.USER_IMAGES)
        .update({
          status: 'completed',
          storage_url: originalUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingImage.id)

      return NextResponse.json({
        success: true,
        data: {
          imageId: existingImage.id,
          status: 'completed',
          storageUrl: originalUrl,
          message: 'Image ready',
          userEmail
        }
      })
    }

    // 🔥 简化方案：直接使用 Wavespeed URL，不下载到 Supabase Storage
    // 原因：图片 URL 通常较小且稳定，无需额外存储开销
    console.log(`💾 Creating image metadata in database`)

    // 🔥 获取图片文件大小
    let fileSize: number | null = null
    try {
      console.log(`📏 Fetching image size from: ${originalUrl}`)
      const response = await fetch(originalUrl, { method: 'HEAD' })
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        fileSize = parseInt(contentLength, 10)
        console.log(`✅ Image size: ${(fileSize / 1024).toFixed(2)} KB`)
      } else {
        console.warn(`⚠️ No content-length header, fetching full image...`)
        // Fallback: 如果没有 content-length,下载图片获取大小
        const fullResponse = await fetch(originalUrl)
        const blob = await fullResponse.blob()
        fileSize = blob.size
        console.log(`✅ Image size (from blob): ${(fileSize / 1024).toFixed(2)} KB`)
      }
    } catch (error) {
      console.error(`❌ Failed to get image size:`, error)
      // 继续执行,但 file_size 为 null
    }

    const { data: imageData, error: dbError } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .insert({
        user_id: userId,
        wavespeed_request_id: wavespeedRequestId,
        original_url: originalUrl,
        storage_url: originalUrl, // 直接使用原始 URL
        storage_path: null, // 不使用 Supabase Storage
        prompt: settings.prompt || 'Generated image',
        model: settings.model,
        aspect_ratio: settings.aspectRatio || null,
        generation_type: settings.generationType || 'text-to-image',
        source_images: settings.sourceImages || null,
        status: 'completed',
        file_size: fileSize, // 🔥 记录文件大小
        metadata: {
          settings: settings,
          stored_at: new Date().toISOString(),
          user_email: userEmail,
          file_size_bytes: fileSize
        }
      })
      .select('id, storage_url, file_size')
      .single()

    if (dbError) {
      console.error('❌ Database insert failed:', dbError)
      throw new Error(`Database insert failed: ${dbError.message}`)
    }

    console.log(`✅ Image stored successfully: ${imageData.id}, size: ${fileSize ? (fileSize / 1024).toFixed(2) + ' KB' : 'unknown'}`)

    return NextResponse.json({
      success: true,
      data: {
        imageId: imageData.id,
        status: 'completed',
        storageUrl: imageData.storage_url,
        fileSize: imageData.file_size,
        message: 'Image saved successfully',
        userEmail
      }
    })

  } catch (error) {
    console.error('❌ Image storage failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/image/store?imageId=xxx
 * 查询图片存储状态
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const imageId = url.searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'Image ID required' },
        { status: 400 }
      )
    }

    // 验证用户认证
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 查询图片信息
    const { data: image, error } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select('id, status, storage_url, error_message, created_at, updated_at')
      .eq('id', imageId)
      .eq('user_id', session.user.uuid)
      .single()

    if (error || !image) {
      // 如果图片不存在，返回默认已完成状态
      return NextResponse.json({
        success: true,
        data: {
          imageId,
          status: 'completed',
          progress: 100,
          error: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        imageId: image.id,
        status: image.status,
        storageUrl: image.storage_url,
        error: image.error_message,
        createdAt: image.created_at,
        updatedAt: image.updated_at
      }
    })

  } catch (error) {
    console.error('❌ Get image storage status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

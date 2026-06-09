/**
 * Image Storage API
 * 下载并存储已完成的图片从 Wavespeed 到 Supabase Storage
 * 参考: /app/api/video/store/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { VideoStorageManager } from '@/lib/storage'
import { queuePromptPurposeAnalysis } from '@/lib/admin/prompt-purpose-analyzer'

function getIncomingPrompt(settings: any): string | null {
  return typeof settings?.prompt === 'string' && settings.prompt.trim()
    ? settings.prompt.trim()
    : null
}

function queuePromptPurposeForImage(input: {
  imageId: string
  userId: string
  prompt?: string | null
  generationType?: string | null
  createdAt?: string | null
}) {
  queuePromptPurposeAnalysis({
    taskType: 'image_generation',
    taskId: input.imageId,
    userId: input.userId,
    prompt: input.prompt,
    createdAt: input.createdAt || null,
    generationType: input.generationType || null
  })
}

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
  const db = supabaseAdmin as any

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

    const { data: user, error: userError } = await db
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
    const { data: existingImages } = await db
      .from(TABLES.USER_IMAGES)
      .select('id, user_id, status, storage_url, prompt, generation_type, created_at')
      .eq('wavespeed_request_id', wavespeedRequestId)
      .eq('user_id', userId)
      .limit(1)

    if (existingImages && existingImages.length > 0) {
      const existingImage = existingImages[0]
      console.log(`✅ Image already exists: ${existingImage.id}`)
      const incomingPrompt = getIncomingPrompt(settings)
      const shouldPatchPrompt = !!incomingPrompt && (!existingImage.prompt || existingImage.prompt === 'Generated image')
      const promptForAnalysis = shouldPatchPrompt
        ? incomingPrompt
        : existingImage.prompt || incomingPrompt || 'Generated image'
      const generationType = settings.generationType || existingImage.generation_type || 'text-to-image'

      // 如果已完成，直接返回
      if (existingImage.status === 'completed' && existingImage.storage_url) {
        if (shouldPatchPrompt) {
          await db
            .from(TABLES.USER_IMAGES)
            .update({
              prompt: incomingPrompt,
              generation_type: generationType,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingImage.id)
        }

        queuePromptPurposeForImage({
          imageId: existingImage.id,
          userId,
          prompt: promptForAnalysis,
          generationType,
          createdAt: existingImage.created_at
        })

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
      await db
        .from(TABLES.USER_IMAGES)
        .update({
          status: 'completed',
          storage_url: originalUrl,
          prompt: incomingPrompt || existingImage.prompt || 'Generated image',
          generation_type: generationType,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingImage.id)

      queuePromptPurposeForImage({
        imageId: existingImage.id,
        userId,
        prompt: promptForAnalysis,
        generationType,
        createdAt: existingImage.created_at
      })

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

    // 🔥 下载图片并上传到 Supabase Storage（永久存储）
    console.log(`💾 Downloading and uploading image to Supabase Storage...`)

    let supabaseImageUrl: string | null = null
    let storagePath: string | null = null
    let fileSize: number | null = null

    try {
      // 下载图片
      console.log(`📥 Downloading image from: ${originalUrl.substring(0, 80)}...`)
      const imageResponse = await fetch(originalUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      fileSize = imageBuffer.length
      console.log(`✅ Downloaded image: ${(fileSize / 1024).toFixed(2)} KB`)

      // 确定图片格式
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

      // 生成唯一的图片ID（使用 wavespeedRequestId）
      const imageId = wavespeedRequestId.replace(/[^a-zA-Z0-9]/g, '_')

      // 上传到 Supabase Storage
      console.log(`📤 Uploading to Supabase Storage...`)
      const uploadResult = await VideoStorageManager.uploadImage(
        userId,
        imageId,
        imageBuffer,
        contentType
      )

      supabaseImageUrl = uploadResult.url
      storagePath = uploadResult.path
      console.log(`✅ Image uploaded to Supabase: ${storagePath}`)
    } catch (uploadError) {
      console.error(`⚠️ Failed to upload to Supabase Storage:`, uploadError)
      // 如果上传失败，回退到使用原始 URL
      supabaseImageUrl = null
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

    const { data: imageData, error: dbError } = await db
      .from(TABLES.USER_IMAGES)
      .insert({
        user_id: userId,
        wavespeed_request_id: wavespeedRequestId,
        original_url: originalUrl,  // BytePlus 原始 URL（24小时过期）
        storage_url: supabaseImageUrl || originalUrl,  // 优先使用 Supabase 永久 URL
        storage_path: storagePath,  // Supabase Storage 路径
        prompt: settings.prompt || 'Generated image',
        model: settings.model,
        aspect_ratio: settings.aspectRatio || null,
        generation_type: settings.generationType || 'text-to-image',
        source_images: settings.sourceImages || null,
        status: 'completed',
        file_size: fileSize,
        metadata: {
          settings: settings,
          stored_at: new Date().toISOString(),
          user_email: userEmail,
          file_size_bytes: fileSize,
          uploaded_to_supabase: !!supabaseImageUrl,  // 标记是否上传到 Supabase
          storage_path: storagePath
        }
      })
      .select('id, storage_url, file_size, storage_path')
      .single()

    if (dbError) {
      console.error('❌ Database insert failed:', dbError)
      throw new Error(`Database insert failed: ${dbError.message}`)
    }

    const isSupabaseStored = !!supabaseImageUrl
    console.log(`✅ Image stored successfully: ${imageData.id}`)
    console.log(`   - File size: ${fileSize ? (fileSize / 1024).toFixed(2) + ' KB' : 'unknown'}`)
    console.log(`   - Supabase Storage: ${isSupabaseStored ? '✅ Yes' : '⚠️ No (using original URL)'}`)
    if (storagePath) {
      console.log(`   - Storage path: ${storagePath}`)
    }

    queuePromptPurposeForImage({
      imageId: imageData.id,
      userId,
      prompt: settings.prompt || 'Generated image',
      generationType: settings.generationType || 'text-to-image',
      createdAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        imageId: imageData.id,
        status: 'completed',
        storageUrl: imageData.storage_url,
        storagePath: imageData.storage_path,
        fileSize: imageData.file_size,
        uploadedToSupabase: isSupabaseStored,
        message: isSupabaseStored
          ? 'Image saved to Supabase Storage (permanent)'
          : 'Image metadata saved (using original URL)',
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
    const db = supabaseAdmin as any
    const { data: image, error } = await db
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

/**
 * 通用图片上传 API
 * 用于前端上传图片到 Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { VideoStorageManager } from '@/lib/storage'

/**
 * 上传图片
 * POST /api/upload
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 解析 FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    console.log('[Upload API] Uploading image', {
      userId: session.user.uuid,
      fileName: file.name,
      fileType: file.type,
      fileSize: `${(file.size / 1024).toFixed(2)} KB`
    })

    // 生成唯一的 imageId
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const imageId = `upload-${timestamp}-${random}`

    // 转换 File 为 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传到 Supabase Storage
    try {
      const result = await VideoStorageManager.uploadImage(
        session.user.uuid,
        imageId,
        buffer,
        file.type
      )

      console.log('[Upload API] Upload successful', {
        path: result.path,
        url: result.url
      })

      return NextResponse.json({
        success: true,
        url: result.url,
        path: result.path
      })
    } catch (uploadError) {
      console.error('[Upload API] Upload failed:', uploadError)
      return NextResponse.json(
        {
          error: 'Failed to upload image',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined
      },
      { status: 500 }
    )
  }
}

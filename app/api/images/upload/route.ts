/**
 * Image Upload API Route - for image-to-video functionality
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { VideoStorageManager } from '@/lib/storage'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
// 移除对浏览器API图片处理器的依赖
import { v4 as uuidv4 } from 'uuid'

/**
 * 服务器端图片文件验证函数 - 兼容Node.js环境
 */
function validateImageFile(file: {
  type: string;
  size: number;
  name: string;
}): { valid: boolean; error?: string } {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format: ${file.type}. Supported formats: JPG, PNG, WebP`
    }
  }

  // 检查文件大小 (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image file too large. Maximum: ${maxSize / (1024 * 1024)}MB, Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Image upload request received')

    // 认证检查
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      console.error('❌ Image upload: Authentication failed')
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      console.error('❌ Image upload: User UUID/ID missing')
      return NextResponse.json(
        { error: 'User UUID missing' },
        { status: 401 }
      )
    }

    console.log(`✅ User authenticated: ${userId}`)

    // Parse form data
    const formData = await request.formData()
    const fileEntry = formData.get('file')
    const quality = formData.get('quality') as string || 'STANDARD'

    console.log('📦 FormData entries:', Array.from(formData.keys()))

    if (!fileEntry || typeof fileEntry === 'string') {
      console.error('❌ No file in FormData or file is string:', typeof fileEntry)
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // In Node.js environment, this will be a File-like object
    const file = fileEntry as File

    console.log('📄 File info:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // 服务器端验证文件类型和大小
    const validation = validateImageFile({
      type: file.type,
      size: file.size,
      name: file.name
    })
    if (!validation.valid) {
      console.error('❌ File validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    console.log('✅ File validation passed')

    // 转换文件为Buffer (服务器端处理)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📤 Uploading to Supabase Storage...`)

    // 上传到Supabase Storage
    const imageId = uuidv4()
    const uploadResult = await VideoStorageManager.uploadImage(
      userId,
      imageId,
      buffer,
      file.type
    )

    console.log(`✅ Upload completed:`, uploadResult.url)

    // 返回上传结果
    return NextResponse.json({
      success: true,
      data: {
        id: imageId,
        url: uploadResult.url,
        path: uploadResult.path,
        originalName: file.name,
        size: file.size,
        type: file.type
      }
    })

  } catch (error) {
    console.error('Image upload API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      console.error('❌ Image delete: Authentication failed')
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      console.error('❌ Image delete: User UUID/ID missing')
      return NextResponse.json(
        { error: 'User UUID missing' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing image ID' },
        { status: 400 }
      )
    }

    // 删除图片文件
    const imagePath = `images/${userId}/${imageId}`
    await VideoStorageManager.deleteFile(imagePath)

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Image deletion API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    )
  }
}
/**
 * Image Upload API Route - for image-to-video functionality
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { VideoStorageManager } from '@/lib/storage'
import { ImageProcessor } from '@/lib/image-processor'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // NextAuth 4.x 认证方式
    const session = await getServerSession(authConfig)


    if (!session?.user?.uuid) {
      console.error('❌ Image upload: Authentication failed')
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const quality = formData.get('quality') as string || 'STANDARD'

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const validation = ImageProcessor.validateImage(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 转换文件为Buffer (服务器端处理)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传到Supabase Storage
    const imageId = uuidv4()
    const uploadResult = await VideoStorageManager.uploadImage(
      session.user.uuid,
      imageId,
      buffer,
      file.type
    )

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
    // NextAuth 4.x 认证方式
    const session = await getServerSession(authConfig)


    if (!session?.user?.uuid) {
      console.error('❌ Image delete: Authentication failed')
      return NextResponse.json(
        { error: 'Unauthorized access' },
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
    const imagePath = `images/${session.user.uuid}/${imageId}`
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
/**
 * 图片上传API路由 - 用于image-to-video功能
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { VideoStorageManager } from '@/lib/storage'
import { ImageProcessor } from '@/lib/image-processor'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 解析表单数据
    const formData = await request.formData()
    const file = formData.get('file') as File
    const quality = formData.get('quality') as string || 'STANDARD'

    if (!file) {
      return NextResponse.json(
        { error: '未上传文件' },
        { status: 400 }
      )
    }

    // 验证文件类型和大小
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
    console.error('图片上传API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: '缺少图片ID' },
        { status: 400 }
      )
    }

    // 删除图片文件
    const imagePath = `images/${session.user.uuid}/${imageId}`
    await VideoStorageManager.deleteFile(imagePath)

    return NextResponse.json({
      success: true,
      message: '图片删除成功'
    })

  } catch (error) {
    console.error('图片删除API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    )
  }
}
/**
 * 图片URL验证API路由
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

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

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '无效的URL' },
        { status: 400 }
      )
    }

    // 验证URL格式
    let urlObj: URL
    try {
      urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return NextResponse.json(
          { error: '只支持HTTP/HTTPS协议的URL' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: '无效的URL格式' },
        { status: 400 }
      )
    }

    // 检查URL可访问性和内容类型
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'VidFab Image Validator'
        }
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `无法访问该URL: HTTP ${response.status}` },
          { status: 400 }
        )
      }

      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')

      // 验证内容类型
      if (!contentType || !contentType.startsWith('image/')) {
        return NextResponse.json(
          { error: '该URL不是有效的图片资源' },
          { status: 400 }
        )
      }

      // 验证图片格式
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(contentType)) {
        return NextResponse.json(
          { error: `不支持的图片格式: ${contentType}。支持的格式: JPG, PNG, WebP` },
          { status: 400 }
        )
      }

      // 验证文件大小
      if (contentLength) {
        const size = parseInt(contentLength)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (size > maxSize) {
          return NextResponse.json(
            {
              error: `图片文件过大。最大支持: ${maxSize / (1024 * 1024)}MB，当前: ${(size / (1024 * 1024)).toFixed(2)}MB`
            },
            { status: 400 }
          )
        }
      }

      // 尝试获取图片尺寸信息（通过下载部分数据）
      let metadata = null
      try {
        const imageResponse = await fetch(url, {
          headers: {
            'Range': 'bytes=0-2048', // 只下载前2KB用于获取尺寸信息
            'User-Agent': 'VidFab Image Validator'
          }
        })

        if (imageResponse.ok) {
          // 这里可以解析图片头部信息获取尺寸，但为了简化，我们只返回基本信息
          metadata = {
            contentType,
            size: contentLength ? parseInt(contentLength) : 0,
            url: url
          }
        }
      } catch (error) {
        // 如果获取元数据失败，不影响URL验证结果
        console.warn('获取图片元数据失败:', error)
      }

      return NextResponse.json({
        valid: true,
        metadata,
        message: '图片URL验证成功'
      })

    } catch (error) {
      console.error('URL验证错误:', error)
      return NextResponse.json(
        { error: '无法访问该URL或网络错误' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('图片URL验证API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
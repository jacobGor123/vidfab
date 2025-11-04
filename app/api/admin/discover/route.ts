/**
 * Admin Discover API - 主路由
 * GET: 获取列表（带分页和筛选）
 * POST: 创建新的 Discover 视频
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { categorizePrompt } from '@/lib/discover/categorize'
import { uploadVideoToS3, uploadImageToS3, downloadAndUploadToS3 } from '@/lib/discover/upload'
import { compressImage } from '@/lib/discover/compress-image'
import { compressVideo, checkFfmpegInstalled } from '@/lib/discover/compress-video'
import { DiscoverStatus, type DiscoverQueryParams } from '@/types/discover'

/**
 * GET /api/admin/discover
 * 获取 Discover 视频列表（带分页和筛选）
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'display_order'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin.from('discover_videos').select('*', { count: 'exact' })

    // 筛选条件
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('prompt', `%${search}%`)
    }

    // 排序
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('查询 discover_videos 失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('GET /api/admin/discover 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取列表失败' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/admin/discover
 * 创建新的 Discover 视频
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const formData = await request.formData()

    // 提取字段
    const prompt = formData.get('prompt') as string
    const videoFile = formData.get('videoFile') as File | null
    const videoUrl = formData.get('videoUrl') as string | null
    const imageFile = formData.get('imageFile') as File | null
    const imageUrl = formData.get('imageUrl') as string | null
    const category = formData.get('category') as string | null
    const status = (formData.get('status') as string) || DiscoverStatus.DRAFT
    const isFeatured = formData.get('is_featured') === 'true'
    const displayOrder = parseInt(formData.get('display_order') as string) || 0

    // 验证必填字段
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'prompt 不能为空' }, { status: 400 })
    }

    if (!videoFile && !videoUrl) {
      return NextResponse.json(
        { success: false, error: '必须提供视频文件或视频 URL' },
        { status: 400 }
      )
    }

    // 处理视频上传
    let finalVideoUrl = videoUrl

    if (videoFile) {
      let buffer = Buffer.from(await videoFile.arrayBuffer())

      // 检查视频大小，如果超过 1MB 则压缩
      const videoSizeMB = buffer.length / 1024 / 1024
      console.log(`原始视频大小: ${videoSizeMB.toFixed(2)}MB`)

      if (videoSizeMB > 1) {
        console.log('视频超过 1MB，开始压缩...')
        const compressResult = await compressVideo(buffer, { targetSizeMB: 1 })

        if (!compressResult.success) {
          // 如果压缩失败（比如 ffmpeg 未安装），返回错误
          return NextResponse.json(
            { success: false, error: `视频压缩失败: ${compressResult.error}` },
            { status: 500 }
          )
        }

        // 使用压缩后的 buffer
        buffer = compressResult.buffer!
        console.log(`压缩后视频大小: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`)

        // 如果有警告，记录到控制台
        if (compressResult.warning) {
          console.warn(compressResult.warning)
        }
      }

      const uploadResult = await uploadVideoToS3(buffer, 'video/mp4')

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: `视频上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalVideoUrl = uploadResult.url!
    } else if (videoUrl) {
      // 如果提供的是 URL，可选择下载后上传到自己的 S3（更可控）
      // 这里暂时直接使用提供的 URL
      finalVideoUrl = videoUrl
    }

    // 处理图片上传
    let finalImageUrl = imageUrl

    if (imageFile) {
      let buffer = Buffer.from(await imageFile.arrayBuffer())

      // 自动压缩图片并转换为 webp 格式
      const imageSizeKB = buffer.length / 1024
      console.log(`原始图片大小: ${imageSizeKB.toFixed(2)}KB`)

      console.log('压缩图片并转换为 webp 格式...')
      const compressResult = await compressImage(buffer, {
        targetSizeKB: 100,
        format: 'webp',
        quality: 80,
        minQuality: 60,
        maxWidth: 1920
      })

      if (!compressResult.success) {
        return NextResponse.json(
          { success: false, error: `图片压缩失败: ${compressResult.error}` },
          { status: 500 }
        )
      }

      // 使用压缩后的 buffer
      buffer = compressResult.buffer!
      console.log(`压缩后图片大小: ${(buffer.length / 1024).toFixed(2)}KB`)

      const uploadResult = await uploadImageToS3(buffer, 'image/webp')

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: `图片上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalImageUrl = uploadResult.url!
    } else if (imageUrl) {
      finalImageUrl = imageUrl
    }
    // 如果没有图片，finalImageUrl 为 null，后续可以实现自动生成缩略图

    // 自动分类（如果未指定）
    const finalCategory = category || categorizePrompt(prompt)

    // 如果 display_order 为 0，自动设置为最大值 + 1（保证新内容排在最前）
    let finalDisplayOrder = displayOrder
    if (finalDisplayOrder === 0) {
      const { data: maxOrderData } = await supabaseAdmin
        .from('discover_videos')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      finalDisplayOrder = maxOrderData ? maxOrderData.display_order + 1 : 1000
    }

    // 插入数据库
    const { data, error } = await supabaseAdmin
      .from('discover_videos')
      .insert({
        prompt,
        video_url: finalVideoUrl,
        image_url: finalImageUrl,
        category: finalCategory,
        status,
        is_featured: isFeatured,
        display_order: finalDisplayOrder,
        created_by: admin.uuid
      })
      .select()
      .single()

    if (error) {
      console.error('插入 discover_videos 失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: '创建成功'
    })
  } catch (error: any) {
    console.error('POST /api/admin/discover 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: error.status || 500 }
    )
  }
}

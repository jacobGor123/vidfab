/**
 * Admin Discover API - 单条记录路由
 * GET: 获取单条记录
 * PUT: 更新记录
 * DELETE: 删除记录
 */

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { categorizePrompt } from '@/lib/discover/categorize'
import {
  uploadVideoToDiscoverStorage,
  uploadImageToDiscoverStorage,
  deleteDiscoverAssetsFromStorage
} from '@/lib/discover/upload'
import { compressVideo } from '@/lib/discover/compress-video'
import { compressImage } from '@/lib/discover/compress-image'
import { extractVideoThumbnail } from '@/lib/discover/extract-thumbnail'
import { discoverJson, revalidateDiscoverContent } from '@/lib/discover/cache-control'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/admin/discover/[id]
 * 获取单条 Discover 视频记录
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const db = supabaseAdmin as any

    const { id } = params

    const { data, error } = await db
      .from('discover_videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return discoverJson({ success: false, error: '记录不存在' }, { status: 404 })
    }

    return discoverJson({ success: true, data })
  } catch (error: any) {
    console.error('GET /api/admin/discover/[id] 错误:', error)
    return discoverJson(
      { success: false, error: error.message || '获取记录失败' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/admin/discover/[id]
 * 更新 Discover 视频记录
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const db = supabaseAdmin as any

    const { id } = params
    const formData = await request.formData()

    // 检查记录是否存在
    const { data: existing, error: fetchError } = await db
      .from('discover_videos')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return discoverJson({ success: false, error: '记录不存在' }, { status: 404 })
    }

    // 提取字段
    const prompt = (formData.get('prompt') as string) || existing.prompt
    const videoFile = formData.get('videoFile') as File | null
    const videoUrl = formData.get('videoUrl') as string | null
    const imageFile = formData.get('imageFile') as File | null
    const imageUrl = formData.get('imageUrl') as string | null
    const category = formData.get('category') as string | null
    const status = (formData.get('status') as string) || existing.status
    const isFeatured = formData.has('is_featured')
      ? formData.get('is_featured') === 'true'
      : existing.is_featured
    const displayOrder = formData.has('display_order')
      ? parseInt(formData.get('display_order') as string)
      : existing.display_order
    const mediaType = formData.has('media_type')
      ? (formData.get('media_type') as string)
      : existing.media_type
    const contentTab = formData.has('content_tab')
      ? (formData.get('content_tab') as string)
      : existing.content_tab

    if (!['image', 'video'].includes(mediaType)) {
      return discoverJson({ success: false, error: '非法的 media_type' }, { status: 400 })
    }
    if (!['entertainment', 'product_demo'].includes(contentTab)) {
      return discoverJson({ success: false, error: '非法的 content_tab' }, { status: 400 })
    }

    // 处理视频上传
    let finalVideoUrl = existing.video_url
    let videoBuffer: Buffer | null = null // 保存视频 buffer 供后续提取缩略图使用

    if (videoFile) {
      let buffer: Uint8Array = Buffer.from(await videoFile.arrayBuffer())

      // 检查视频大小，如果超过 1MB 则压缩
      const videoSizeMB = buffer.length / 1024 / 1024

      if (videoSizeMB > 1) {
        const compressResult = await compressVideo(buffer, { targetSizeMB: 1 })

        if (!compressResult.success) {
          return discoverJson(
            { success: false, error: `视频压缩失败: ${compressResult.error}` },
            { status: 500 }
          )
        }

        buffer = compressResult.buffer!
      }

      const uploadResult = await uploadVideoToDiscoverStorage(buffer, 'video/mp4')

      if (!uploadResult.success) {
        return discoverJson(
          { success: false, error: `视频上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalVideoUrl = uploadResult.url!
      videoBuffer = Buffer.from(buffer) // 保存 buffer 供后续提取缩略图使用
    } else if (videoUrl) {
      finalVideoUrl = videoUrl
    }

    // 处理图片上传
    let finalImageUrl = existing.image_url

    if (imageFile) {
      let buffer: Uint8Array = Buffer.from(await imageFile.arrayBuffer())

      // 自动压缩图片并转换为 webp 格式
      const compressResult = await compressImage(buffer, {
        targetSizeKB: 100,
        format: 'webp',
        quality: 80,
        minQuality: 60,
        maxWidth: 1920
      })

      if (!compressResult.success) {
        return discoverJson(
          { success: false, error: `图片压缩失败: ${compressResult.error}` },
          { status: 500 }
        )
      }

      buffer = compressResult.buffer!

      const uploadResult = await uploadImageToDiscoverStorage(buffer, 'image/webp')

      if (!uploadResult.success) {
        return discoverJson(
          { success: false, error: `图片上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalImageUrl = uploadResult.url!
    } else if (imageUrl !== null) {
      finalImageUrl = imageUrl
    } else if (videoBuffer && !existing.image_url) {
      // 如果当前没有图片，且上传了新视频，自动从视频中提取第一帧作为缩略图
      const thumbnailResult = await extractVideoThumbnail(videoBuffer, {
        timestamp: 0.1,
        format: 'webp',
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        targetSizeKB: 100
      })

      if (thumbnailResult.success) {
        const uploadResult = await uploadImageToDiscoverStorage(thumbnailResult.buffer!, 'image/webp')

        if (uploadResult.success) {
          finalImageUrl = uploadResult.url!
        }
      }
    }

    // 自动分类（如果未指定且 prompt 有变化）
    const finalCategory = category || (prompt !== existing.prompt ? categorizePrompt(prompt) : existing.category)

    // 更新数据库
    const { data, error } = await db
      .from('discover_videos')
      .update({
        prompt,
        video_url: finalVideoUrl,
        image_url: finalImageUrl,
        category: finalCategory,
        status,
        is_featured: isFeatured,
        display_order: displayOrder,
        media_type: mediaType,
        content_tab: contentTab,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新 discover_videos 失败:', error)
      return discoverJson({ success: false, error: error.message }, { status: 500 })
    }

    const assetCleanupErrors = await deleteDiscoverAssetsFromStorage([
      finalVideoUrl !== existing.video_url ? existing.video_url : null,
      finalImageUrl !== existing.image_url ? existing.image_url : null
    ])

    revalidateDiscoverContent()

    return discoverJson({
      success: true,
      data,
      message: assetCleanupErrors.length > 0
        ? '更新成功，但旧素材清理失败'
        : '更新成功',
      assetCleanupErrors
    })
  } catch (error: any) {
    console.error('PUT /api/admin/discover/[id] 错误:', error)
    return discoverJson(
      { success: false, error: error.message || '更新失败' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/admin/discover/[id]
 * 删除 Discover 视频记录
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const db = supabaseAdmin as any

    const { id } = params

    const { data: existing, error: fetchError } = await db
      .from('discover_videos')
      .select('video_url, image_url')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return discoverJson({ success: false, error: '记录不存在' }, { status: 404 })
    }

    const { error } = await db.from('discover_videos').delete().eq('id', id)

    if (error) {
      console.error('删除 discover_videos 失败:', error)
      return discoverJson({ success: false, error: error.message }, { status: 500 })
    }

    const assetCleanupErrors = await deleteDiscoverAssetsFromStorage([
      existing.video_url,
      existing.image_url
    ])

    revalidateDiscoverContent()

    return discoverJson({
      success: true,
      message: assetCleanupErrors.length > 0
        ? '记录已删除，但部分素材清理失败'
        : '删除成功',
      assetCleanupErrors
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/discover/[id] 错误:', error)
    return discoverJson(
      { success: false, error: error.message || '删除失败' },
      { status: error.status || 500 }
    )
  }
}

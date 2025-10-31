/**
 * Admin Discover API - 单条记录路由
 * GET: 获取单条记录
 * PUT: 更新记录
 * DELETE: 删除记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { categorizePrompt } from '@/lib/discover/categorize'
import { uploadVideoToS3, uploadImageToS3 } from '@/lib/discover/upload'
import { DiscoverStatus } from '@/types/discover'

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

    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('discover_videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('GET /api/admin/discover/[id] 错误:', error)
    return NextResponse.json(
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

    const { id } = params
    const formData = await request.formData()

    // 检查记录是否存在
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('discover_videos')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 })
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

    // 处理视频上传
    let finalVideoUrl = existing.video_url

    if (videoFile) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      const uploadResult = await uploadVideoToS3(buffer, videoFile.type)

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: `视频上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalVideoUrl = uploadResult.url!
    } else if (videoUrl) {
      finalVideoUrl = videoUrl
    }

    // 处理图片上传
    let finalImageUrl = existing.image_url

    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const uploadResult = await uploadImageToS3(buffer, imageFile.type)

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: `图片上传失败: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      finalImageUrl = uploadResult.url!
    } else if (imageUrl !== null) {
      finalImageUrl = imageUrl
    }

    // 自动分类（如果未指定且 prompt 有变化）
    const finalCategory = category || (prompt !== existing.prompt ? categorizePrompt(prompt) : existing.category)

    // 更新数据库
    const { data, error } = await supabaseAdmin
      .from('discover_videos')
      .update({
        prompt,
        video_url: finalVideoUrl,
        image_url: finalImageUrl,
        category: finalCategory,
        status,
        is_featured: isFeatured,
        display_order: displayOrder
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新 discover_videos 失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: '更新成功'
    })
  } catch (error: any) {
    console.error('PUT /api/admin/discover/[id] 错误:', error)
    return NextResponse.json(
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

    const { id } = params

    const { error } = await supabaseAdmin.from('discover_videos').delete().eq('id', id)

    if (error) {
      console.error('删除 discover_videos 失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error: any) {
    console.error('DELETE /api/admin/discover/[id] 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '删除失败' },
      { status: error.status || 500 }
    )
  }
}

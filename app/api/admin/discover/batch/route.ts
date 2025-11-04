/**
 * Admin Discover API - 批量操作
 * POST: 批量删除、批量更新状态、批量更新排序、批量生成缩略图
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadToBuffer, uploadImageToS3 } from '@/lib/discover/upload'
import { extractVideoThumbnail } from '@/lib/discover/extract-thumbnail'
import type { DiscoverBatchRequest } from '@/types/discover'

/**
 * POST /api/admin/discover/batch
 * 批量操作 Discover 视频记录
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body: DiscoverBatchRequest = await request.json()
    const { action, ids, payload } = body

    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ids 不能为空' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'delete':
        // 批量删除
        result = await supabaseAdmin.from('discover_videos').delete().in('id', ids)
        break

      case 'updateStatus':
        // 批量更新状态
        if (!payload || !payload.status) {
          return NextResponse.json(
            { success: false, error: '缺少 status 参数' },
            { status: 400 }
          )
        }
        result = await supabaseAdmin
          .from('discover_videos')
          .update({ status: payload.status })
          .in('id', ids)
        break

      case 'updateOrder':
        // 批量更新排序（暂不支持，需要前端提供每条的 display_order）
        return NextResponse.json(
          { success: false, error: '批量更新排序暂不支持，请使用拖拽排序' },
          { status: 400 }
        )

      case 'generateThumbnails':
        // 批量生成缩略图
        return await handleGenerateThumbnails(ids)

      default:
        return NextResponse.json({ success: false, error: '无效的操作类型' }, { status: 400 })
    }

    if (result.error) {
      console.error('批量操作失败:', result.error)
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `批量${action === 'delete' ? '删除' : '更新'}成功`,
      affected: ids.length
    })
  } catch (error: any) {
    console.error('POST /api/admin/discover/batch 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '批量操作失败' },
      { status: error.status || 500 }
    )
  }
}

/**
 * 批量生成缩略图
 * 对于指定的 discover 记录，如果没有 image_url，则从 video_url 提取第一帧作为缩略图
 */
async function handleGenerateThumbnails(ids: number[]) {
  try {
    // 获取指定 ids 的记录
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('discover_videos')
      .select('id, video_url, image_url')
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: `获取记录失败: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, error: '未找到任何记录' }, { status: 404 })
    }

    // 筛选出没有 image_url 且有 video_url 的记录
    const recordsToProcess = records.filter((r) => !r.image_url && r.video_url)

    if (recordsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有记录都已有缩略图',
        processed: 0,
        failed: 0
      })
    }

    // 逐个处理记录
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>
    }

    for (const record of recordsToProcess) {
      try {
        // 下载视频到 buffer
        const videoBuffer = await downloadToBuffer(record.video_url)

        if (!videoBuffer) {
          results.failed++
          results.errors.push({ id: record.id, error: '下载视频失败' })
          continue
        }

        // 提取第一帧
        const thumbnailResult = await extractVideoThumbnail(videoBuffer, {
          timestamp: 0.1,
          format: 'webp',
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          targetSizeKB: 100
        })

        if (!thumbnailResult.success) {
          results.failed++
          results.errors.push({
            id: record.id,
            error: `提取缩略图失败: ${thumbnailResult.error}`
          })
          continue
        }

        // 上传到 S3
        const uploadResult = await uploadImageToS3(thumbnailResult.buffer!, 'image/webp')

        if (!uploadResult.success) {
          results.failed++
          results.errors.push({
            id: record.id,
            error: `上传缩略图失败: ${uploadResult.error}`
          })
          continue
        }

        // 更新数据库
        const { error: updateError } = await supabaseAdmin
          .from('discover_videos')
          .update({ image_url: uploadResult.url })
          .eq('id', record.id)

        if (updateError) {
          results.failed++
          results.errors.push({
            id: record.id,
            error: `更新数据库失败: ${updateError.message}`
          })
          continue
        }

        results.processed++
      } catch (error) {
        results.failed++
        results.errors.push({
          id: record.id,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量生成缩略图完成，成功 ${results.processed} 条，失败 ${results.failed} 条`,
      processed: results.processed,
      failed: results.failed,
      errors: results.errors
    })
  } catch (error: any) {
    console.error('批量生成缩略图错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '批量生成缩略图失败' },
      { status: 500 }
    )
  }
}

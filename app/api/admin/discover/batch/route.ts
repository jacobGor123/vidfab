/**
 * Admin Discover API - 批量操作
 * POST: 批量删除、批量更新状态、批量更新排序
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
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

/**
 * Admin Discover API - 统计信息
 * GET: 获取各种统计数据
 */

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { DiscoverCategory, DiscoverStatus } from '@/types/discover'
import { discoverJson } from '@/lib/discover/cache-control'

// 标记为动态路由（使用 requireAdmin 需要 headers）
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * GET /api/admin/discover/stats
 * 获取 Discover 视频统计信息
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const db = supabaseAdmin as any

    // 获取总数
    const { count: total, error: totalError } = await db
      .from('discover_videos')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('获取总数失败:', totalError)
      return discoverJson({ success: false, error: totalError.message }, { status: 500 })
    }

    // 按分类统计
    const byCategoryPromises = Object.values(DiscoverCategory).map(async category => {
      const { count } = await db
        .from('discover_videos')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)

      return { category, count: count || 0 }
    })

    const byCategoryResults = await Promise.all(byCategoryPromises)
    const byCategory: Record<string, number> = {}
    byCategoryResults.forEach(({ category, count }) => {
      byCategory[category] = count
    })

    // 按状态统计
    const byStatusPromises = Object.values(DiscoverStatus).map(async status => {
      const { count } = await db
        .from('discover_videos')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      return { status, count: count || 0 }
    })

    const byStatusResults = await Promise.all(byStatusPromises)
    const byStatus: Record<string, number> = {}
    byStatusResults.forEach(({ status, count }) => {
      byStatus[status] = count
    })

    // 精选数量
    const { count: featured, error: featuredError } = await db
      .from('discover_videos')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true)

    if (featuredError) {
      console.error('获取精选数量失败:', featuredError)
    }

    return discoverJson({
      success: true,
      data: {
        total: total || 0,
        byCategory,
        byStatus,
        featured: featured || 0
      }
    })
  } catch (error: any) {
    console.error('GET /api/admin/discover/stats 错误:', error)
    return discoverJson(
      { success: false, error: error.message || '获取统计失败' },
      { status: error.status || 500 }
    )
  }
}

/**
 * 公开 Discover API - 分类统计
 * GET: 获取各分类的数量统计
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DiscoverCategory } from '@/types/discover'
import { getCategoryDisplayName } from '@/lib/discover/categorize'

/**
 * GET /api/discover/categories
 * 获取分类统计（仅统计 active 状态的视频）
 */
export async function GET(request: NextRequest) {
  try {
    // 获取总数
    const { count: total, error: totalError } = await supabase
      .from('discover_videos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (totalError) {
      console.error('获取总数失败:', totalError)
      return NextResponse.json({ success: false, error: totalError.message }, { status: 500 })
    }

    // 按分类统计
    const categoriesPromises = Object.values(DiscoverCategory).map(async category => {
      const { count } = await supabase
        .from('discover_videos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('category', category)

      return {
        name: getCategoryDisplayName(category),
        key: category,
        count: count || 0
      }
    })

    const categoriesData = await Promise.all(categoriesPromises)

    // 添加 "All" 分类
    const result = [
      {
        name: 'All',
        key: 'all',
        count: total || 0
      },
      ...categoriesData.filter(cat => cat.count > 0) // 仅返回有数据的分类
    ]

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('GET /api/discover/categories 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取分类统计失败' },
      { status: 500 }
    )
  }
}

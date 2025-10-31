/**
 * 公开 Discover API
 * GET: 获取 active 状态的 Discover 视频列表
 * 供前端 /create 页面使用，无需认证
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/discover
 * 获取公开的 Discover 视频列表（仅返回 active 状态）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const limitParam = searchParams.get('limit')

    // 如果没有指定 limit，则不限制；否则最多 1000 条
    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 1000

    // 构建查询
    let query = supabase
      .from('discover_videos')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    // 分类筛选
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('查询 discover_videos 失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error: any) {
    console.error('GET /api/discover 错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取列表失败' },
      { status: 500 }
    )
  }
}

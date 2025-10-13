/**
 * 积分消费明细查询 API
 * GET /api/subscription/transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userUuid = session.user.uuid

    // 获取分页参数
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 筛选交易类型: earned/spent/refunded

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin
      .from('credits_transactions')
      .select('*', { count: 'exact' })
      .eq('user_uuid', userUuid)
      .order('created_at', { ascending: false })

    // 添加类型筛选
    if (type && type !== 'all') {
      query = query.eq('transaction_type', type)
    }

    // 执行分页查询
    const { data: transactions, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Error in transactions API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
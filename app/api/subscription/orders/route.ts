/**
 * 历史订单查询 API
 * GET /api/subscription/orders
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

    console.log('📊 Orders API called')
    console.log('Session:', {
      exists: !!session,
      email: session?.user?.email,
      uuid: session?.user?.uuid,
      name: session?.user?.name
    })

    if (!session?.user?.uuid) {
      console.log('❌ No session UUID found')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userUuid = session.user.uuid
    console.log(`🔍 Looking for orders with UUID: ${userUuid}`)

    // 获取分页参数
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 筛选状态

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin
      .from('subscription_orders')
      .select('*', { count: 'exact' })
      .eq('user_uuid', userUuid)
      .order('created_at', { ascending: false })

    // 添加状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // 执行分页查询
    const { data: orders, error, count } = await query
      .range(offset, offset + limit - 1)

    console.log(`📈 Query result:`, {
      ordersCount: orders?.length || 0,
      totalCount: count,
      error: error?.message
    })

    if (error) {
      console.error('❌ Error fetching orders:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // 如果没有订单，尝试查看是否有其他可能的UUID
    if ((!orders || orders.length === 0) && session?.user?.email) {
      console.log(`⚠️ No orders found for UUID ${userUuid}, checking by email...`)

      // 查询用户的其他可能UUID
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('uuid')
        .eq('email', session.user.email)
        .single()

      if (userByEmail && userByEmail.uuid !== userUuid) {
        console.log(`🔄 Found different UUID for email ${session.user.email}: ${userByEmail.uuid}`)

        // 尝试用邮箱对应的UUID查询订单
        const { data: ordersForEmailUuid, count: emailCount } = await supabaseAdmin
          .from('subscription_orders')
          .select('*', { count: 'exact' })
          .eq('user_uuid', userByEmail.uuid)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (ordersForEmailUuid && ordersForEmailUuid.length > 0) {
          console.log(`✅ Found ${ordersForEmailUuid.length} orders for email-based UUID`)

          return NextResponse.json({
            success: true,
            orders: ordersForEmailUuid,
            pagination: {
              page,
              limit,
              total: emailCount || 0,
              totalPages: Math.ceil((emailCount || 0) / limit),
            },
            debug: {
              sessionUuid: userUuid,
              emailUuid: userByEmail.uuid,
              message: 'Orders found using email-based UUID lookup'
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Error in orders API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
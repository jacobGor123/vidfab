/**
 * 取消订单 API
 * POST /api/subscription/orders/[orderId]/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getIsoTimestr } from '@/lib/time';

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // 验证用户登录
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.orderId;

    console.log(`[CANCEL_ORDER] 用户 ${session.user.email} 请求取消订单 ${orderId}`);

    // 查询订单
    const { data: order, error: queryError } = await supabaseAdmin
      .from('subscription_orders')
      .select('id, user_uuid, status, plan_id, billing_cycle, amount_cents')
      .eq('id', orderId)
      .single();

    if (queryError || !order) {
      console.error('[CANCEL_ORDER] 订单不存在:', queryError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 验证订单所有权
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('uuid')
      .eq('email', session.user.email)
      .single();

    if (!user || user.uuid !== order.user_uuid) {
      console.error('[CANCEL_ORDER] 订单不属于当前用户');
      return NextResponse.json(
        { error: 'You can only cancel your own orders' },
        { status: 403 }
      );
    }

    // 检查订单状态
    if (order.status !== 'pending') {
      console.error(`[CANCEL_ORDER] 订单状态为 ${order.status},无法取消`);
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // 取消订单
    const { error: updateError } = await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: 'Cancelled by user',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[CANCEL_ORDER] 更新订单失败:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    console.log(`[CANCEL_ORDER] ✅ 订单 ${orderId} 已取消`);

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      orderId,
    });
  } catch (error: any) {
    console.error('[CANCEL_ORDER] 取消订单失败:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order', details: error.message },
      { status: 500 }
    );
  }
}

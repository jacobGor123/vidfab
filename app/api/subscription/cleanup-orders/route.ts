/**
 * 清理过期订单 API
 * GET /api/subscription/cleanup-orders
 * 管理员专用端点
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cleanupExpiredPendingOrders } from '@/lib/subscription/order-cleanup';

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // 获取参数
    const searchParams = req.nextUrl.searchParams;
    const hoursThreshold = parseInt(searchParams.get('hours') || '24', 10);

    console.log(`[CLEANUP_API] 管理员 ${session.user.email} 触发订单清理`);

    // 执行清理
    const result = await cleanupExpiredPendingOrders(hoursThreshold);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cleanedCount: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cleanedCount: result.cleanedCount,
      hoursThreshold,
      message: `成功清理 ${result.cleanedCount} 个超过 ${hoursThreshold} 小时未支付的订单`,
    });
  } catch (error: any) {
    console.error('[CLEANUP_API] 清理订单失败:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup orders', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { hours = 24 } = body;

    console.log(`[CLEANUP_API] 管理员 ${session.user.email} 触发订单清理 (POST)`);

    const result = await cleanupExpiredPendingOrders(hours);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cleanedCount: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cleanedCount: result.cleanedCount,
      hoursThreshold: hours,
      message: `成功清理 ${result.cleanedCount} 个超过 ${hours} 小时未支付的订单`,
    });
  } catch (error: any) {
    console.error('[CLEANUP_API] 清理订单失败:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup orders', details: error.message },
      { status: 500 }
    );
  }
}

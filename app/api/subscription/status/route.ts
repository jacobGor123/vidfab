/**
 * 获取用户订阅状态API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { SubscriptionService } from '@/lib/subscription/subscription-service';

// 强制动态渲染
export const dynamic = 'force-dynamic';

const subscriptionService = new SubscriptionService();

export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取订阅状态
    const result = await subscriptionService.getUserSubscriptionStatus(session.user.uuid);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      credits_remaining: result.credits_remaining,
      plan_limits: result.plan_limits,
    });

  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
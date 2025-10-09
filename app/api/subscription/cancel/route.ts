/**
 * 取消用户订阅API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import { z } from 'zod';

const cancelSubscriptionSchema = z.object({
  cancel_at_period_end: z.boolean().optional().default(true),
});

const subscriptionService = new SubscriptionService();

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const { cancel_at_period_end } = cancelSubscriptionSchema.parse(body);

    // 取消订阅
    const result = await subscriptionService.cancelUserSubscription(
      session.user.uuid,
      cancel_at_period_end
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // 🔥 区分正常取消和清理完成
    if (result.cleaned) {
      return NextResponse.json({
        success: true,
        cleaned: true,
        message: result.error || 'Subscription data has been cleaned up. You are now on the free plan.',
      });
    }

    return NextResponse.json({
      success: true,
      message: cancel_at_period_end
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription has been canceled immediately',
    });

  } catch (error: any) {
    console.error('Error canceling subscription:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cancel subscription endpoint',
    method: 'POST',
    body: {
      cancel_at_period_end: 'boolean (optional, default: true) - Whether to cancel at period end or immediately'
    }
  });
}
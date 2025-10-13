/**
 * 订阅管理API - 处理升级、降级和门户链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/config';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import { z } from 'zod';

const manageSubscriptionSchema = z.object({
  action: z.enum(['upgrade', 'portal']),
  plan_id: z.enum(['lite', 'pro', 'premium']).optional(),
  billing_cycle: z.enum(['monthly', 'annual']).optional(),
  return_url: z.string().url().optional(),
});

const subscriptionService = new SubscriptionService();

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const { action, plan_id, billing_cycle, return_url } = manageSubscriptionSchema.parse(body);

    if (action === 'upgrade') {
      if (!plan_id || !billing_cycle) {
        return NextResponse.json(
          { success: false, error: 'plan_id and billing_cycle are required for upgrade' },
          { status: 400 }
        );
      }

      // 处理订阅升级
      const result = await subscriptionService.upgradeSubscription(
        session.user.uuid,
        plan_id,
        billing_cycle
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        checkout_url: result.checkout_url,
        message: result.checkout_url ? 'Checkout session created' : 'Subscription upgraded successfully',
      });

    } else if (action === 'portal') {
      // 创建客户门户会话
      const result = await subscriptionService.createPortalSession(
        session.user.uuid,
        return_url
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        portal_url: result.portal_url,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error managing subscription:', error);

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
    message: 'Subscription management endpoint',
    method: 'POST',
    actions: {
      upgrade: {
        description: 'Upgrade subscription to a new plan',
        required_fields: ['plan_id', 'billing_cycle'],
        optional_fields: []
      },
      portal: {
        description: 'Create customer portal session for self-service management',
        required_fields: [],
        optional_fields: ['return_url']
      }
    },
    body_example: {
      action: 'upgrade | portal',
      plan_id: 'lite | pro | premium (required for upgrade)',
      billing_cycle: 'monthly | annual (required for upgrade)',
      return_url: 'optional URL to return to after portal session'
    }
  });
}
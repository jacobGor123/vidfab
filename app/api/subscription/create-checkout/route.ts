/**
 * 创建Stripe Checkout会话API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/config';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import { z } from 'zod';

const createCheckoutSchema = z.object({
  plan_id: z.enum(['lite', 'pro', 'premium']),
  billing_cycle: z.enum(['monthly', 'annual']),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
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
    const validatedData = createCheckoutSchema.parse(body);

    // 创建checkout会话
    const result = await subscriptionService.createCheckoutSession(
      session.user.uuid,
      validatedData
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
      session_id: result.session_id,
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);

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
    message: 'Create checkout endpoint',
    method: 'POST',
    body: {
      plan_id: 'lite | pro | premium',
      billing_cycle: 'monthly | annual',
      success_url: 'optional redirect URL after success',
      cancel_url: 'optional redirect URL after cancel'
    }
  });
}
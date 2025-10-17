/**
 * 测试专用：手动验证支付状态API
 * 仅在开发环境使用，无需身份验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const subscriptionService = new SubscriptionService();

export async function POST(req: NextRequest) {
  try {
    // 仅在开发环境使用
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Only available in development' },
        { status: 403 }
      );
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    console.log(`🧪 [TEST] Manual payment verification for session: ${sessionId}`);

    // 从Stripe获取checkout session详情
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items', 'line_items.data.price']
    });

    console.log(`💳 [TEST] Checkout session:`, {
      id: checkoutSession.id,
      payment_status: checkoutSession.payment_status,
      mode: checkoutSession.mode,
      metadata: checkoutSession.metadata
    });

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed', status: checkoutSession.payment_status },
        { status: 400 }
      );
    }

    if (checkoutSession.mode !== 'subscription') {
      return NextResponse.json(
        { success: false, error: 'Not a subscription payment' },
        { status: 400 }
      );
    }

    // 获取订阅信息
    const subscription = checkoutSession.subscription as Stripe.Subscription;
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No subscription found' },
        { status: 400 }
      );
    }

    console.log(`🔍 [TEST] Subscription details:`, {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end
    });

    // 从metadata获取计划信息
    const userUuid = checkoutSession.metadata?.user_uuid;
    const planId = checkoutSession.metadata?.plan_id;
    const billingCycle = checkoutSession.metadata?.billing_cycle;

    if (!userUuid || !planId || !billingCycle) {
      console.error('Missing metadata:', { userUuid, planId, billingCycle });
      return NextResponse.json(
        { success: false, error: 'Missing plan metadata', metadata: checkoutSession.metadata },
        { status: 400 }
      );
    }

    console.log(`✅ [TEST] Plan details:`, { userUuid, planId, billingCycle });

    // 手动触发订阅创建逻辑（使用我们修复的代码）
    await subscriptionService.handleSubscriptionCreated(
      subscription.id,
      subscription.customer as string,
      userUuid,
      planId as any,
      billingCycle as any
    );

    console.log(`🎉 [TEST] Subscription manually verified and processed!`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated (TEST MODE)',
      subscription: {
        id: subscription.id,
        customer: subscription.customer,
        plan: planId,
        billing_cycle: billingCycle,
        status: subscription.status,
        user_uuid: userUuid
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST] Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test payment verification endpoint active',
    usage: 'POST with { "sessionId": "cs_test_..." }'
  });
}
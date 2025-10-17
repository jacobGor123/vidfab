/**
 * 手动验证支付状态API - 开发环境使用
 * 用于在本地开发时手动触发订阅创建逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Manual payment verification for session: ${sessionId}`);

    // 从Stripe获取checkout session详情
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items', 'line_items.data.price']
    });

    console.log(`💳 Checkout session status: ${checkoutSession.payment_status}`);

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed' },
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

    console.log(`🔍 Processing subscription: ${subscription.id}`);

    // 从metadata获取计划信息
    const userUuid = checkoutSession.metadata?.user_uuid || session.user.uuid;
    const planId = checkoutSession.metadata?.plan_id;
    const billingCycle = checkoutSession.metadata?.billing_cycle;

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing plan metadata' },
        { status: 400 }
      );
    }

    console.log(`✅ Plan details:`, { userUuid, planId, billingCycle });

    // 手动触发订阅创建逻辑（使用我们修复的代码）
    await subscriptionService.handleSubscriptionCreated(
      subscription.id,
      subscription.customer as string,
      userUuid,
      planId as any,
      billingCycle as any
    );

    console.log(`🎉 Subscription manually verified and processed!`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        id: subscription.id,
        plan: planId,
        billing_cycle: billingCycle,
        status: subscription.status
      }
    });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
/**
 * Stripe Webhook处理端点 - 简化版（参考iMedio）
 * 只处理checkout.session.completed事件，删除复杂的订阅逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/subscription/stripe-config';
import { handleCheckoutSession } from '@/lib/subscription/checkout-handler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      console.error('[WEBHOOK] Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 验证webhook签名
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // 处理订阅事件
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active (simplified version)' });
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

/**
 * 处理订阅创建事件（保存subscription_stripe_id）
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  try {
    const { updateUser } = await import('@/services/user');

    const userUuid = subscription.metadata?.user_uuid;
    const planId = subscription.metadata?.plan_id;

    if (!userUuid || !planId) {
      console.error('[WEBHOOK] Missing metadata in subscription.created');
      return;
    }

    await updateUser(userUuid, {
      subscription_stripe_id: subscription.id,
      subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
    });

  } catch (error: any) {
    console.error('[WEBHOOK] Error handling subscription.created:', error);
    throw error;
  }
}

/**
 * 处理订阅更新事件（包括取消设置）
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  try {
    // 检查是否设置为期末取消
    if (subscription.cancel_at_period_end) {
      return;
    }

    // 检查订阅状态变化
    if (subscription.status === 'canceled') {
      await handleSubscriptionCanceled(subscription.id);
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling subscription.updated:', error);
    throw error;
  }
}

/**
 * 处理订阅删除事件
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  try {
    await handleSubscriptionCanceled(subscription.id);
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling subscription.deleted:', error);
    throw error;
  }
}

/**
 * 统一的订阅取消处理逻辑
 * 保留用户已购买的积分
 */
async function handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
  try {
    const { updateUser } = await import('@/services/user');
    const { supabaseAdmin, TABLES } = await import('@/lib/supabase');
    const { getIsoTimestr } = await import('@/lib/time');

    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, subscription_plan, subscription_status, credits_remaining')
      .eq('subscription_stripe_id', subscriptionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return;
      }
      throw error;
    }

    if (!user) {
      return;
    }

    const currentCredits = user.credits_remaining || 0;
    const currentPlan = user.subscription_plan;

    await updateUser(user.uuid, {
      subscription_status: 'cancelled',
      subscription_plan: 'free',
      subscription_stripe_id: null,
      updated_at: getIsoTimestr(),
    });

    await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_uuid: user.uuid,
        from_plan: currentPlan,
        to_plan: 'free',
        change_type: 'cancellation',
        credits_before: currentCredits,
        credits_after: currentCredits,
        credits_adjustment: 0,
        reason: 'Subscription canceled - credits retained',
        metadata: {
          canceled_subscription_id: subscriptionId,
          credits_retained: currentCredits,
        },
      });

  } catch (error: any) {
    console.error('[WEBHOOK] Error in handleSubscriptionCanceled:', error);
    throw error;
  }
}
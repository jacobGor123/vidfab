/**
 * Stripe Webhook处理端点 - 简化版（参考iMedio）
 * 只处理checkout.session.completed事件，删除复杂的订阅逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import stripe, { cancelSubscription, verifyWebhookSignature } from '@/lib/subscription/stripe-config';
import { handleCheckoutSession } from '@/lib/subscription/checkout-handler';
import { getInvoiceSubscriptionId } from '@/lib/subscription/invoice';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/pricing-config';
import { normalizePlanId } from '@/lib/subscription/entitlements';
import { resetSubscriptionMonthlyCredits } from '@/lib/subscription/credit-buckets';

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

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

function inferBillingCycle(subscription: Stripe.Subscription): 'monthly' | 'annual' {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === 'year' ? 'annual' : 'monthly';
}

const FAILED_PAYMENT_SUBSCRIPTION_STATUSES = new Set(['incomplete', 'past_due', 'unpaid']);
const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired']);

async function cancelStripeSubscriptionAfterPaymentFailure(subscriptionId: string): Promise<boolean> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch((error) => {
    if (error?.code === 'resource_missing' || error?.statusCode === 404) {
      return null;
    }
    throw error;
  });

  if (!subscription || TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return true;
  }

  if (!FAILED_PAYMENT_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    console.warn('[WEBHOOK] Skipping failed-payment cancellation because subscription recovered or changed:', {
      subscriptionId,
      subscriptionStatus: subscription.status,
    });
    return false;
  }

  await cancelSubscription(subscriptionId, false);
  return true;
}

/**
 * 处理续费成功。初次订阅入账由 checkout.session.completed 处理；
 * 这里只给 subscription_cycle 发放下一周期积分。
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const billingReason = (invoice as any).billing_reason;
  if (billingReason !== 'subscription_cycle') {
    console.log(`[WEBHOOK] Ignoring invoice.payment_succeeded with billing_reason=${billingReason}`);
    return;
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    console.error('[WEBHOOK] Missing subscription ID on invoice.payment_succeeded');
    return;
  }

  const { supabaseAdmin, TABLES } = await import('@/lib/supabase');
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    console.warn('[WEBHOOK] Skipping renewal credit grant because subscription is not active:', {
      invoiceId: invoice.id,
      subscriptionId,
      subscriptionStatus: subscription.status,
    });
    return;
  }

  let { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('uuid, subscription_plan, subscription_status, subscription_stripe_id, credits_remaining')
    .eq('subscription_stripe_id', subscriptionId)
    .single();

  const metadataUserUuid = subscription.metadata?.user_uuid;
  if (!user && metadataUserUuid) {
    const userResult = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, subscription_plan, subscription_status, subscription_stripe_id, credits_remaining')
      .eq('uuid', metadataUserUuid)
      .single();
    if (userResult.data?.subscription_stripe_id === subscriptionId) {
      user = userResult.data;
    }
  }

  if (!user) {
    console.error('[WEBHOOK] User not found or no longer linked for renewal invoice:', { invoiceId: invoice.id, subscriptionId });
    return;
  }

  const { data: existingCreditGrant } = await supabaseAdmin
    .from('credits_transactions')
    .select('id')
    .eq('user_uuid', user.uuid)
    .eq('transaction_type', 'earned')
    .contains('metadata', { invoice_id: invoice.id })
    .limit(1);

  if (existingCreditGrant && existingCreditGrant.length > 0) {
    console.log(`[WEBHOOK] Renewal invoice ${invoice.id} already credited, skipping`);
    return;
  }

  const planId = normalizePlanId(subscription.metadata?.plan_id || user.subscription_plan);
  if (planId === 'free') {
    console.warn('[WEBHOOK] Renewal invoice resolved to free plan, skipping credit grant:', invoice.id);
    return;
  }

  const billingCycle = (subscription.metadata?.billing_cycle as 'monthly' | 'annual' | undefined) || inferBillingCycle(subscription);
  const planConfig = SUBSCRIPTION_PLANS[planId];
  const creditsToGrant = planConfig.credits;
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();

  const creditSnapshot = await resetSubscriptionMonthlyCredits({
    userUuid: user.uuid,
    planId,
    periodStart,
    periodEnd,
    description: `Monthly credits reset for ${planId} ${billingCycle} subscription renewal`,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      plan_id: planId,
      billing_cycle: billingCycle,
      billing_reason: billingReason,
    },
  });

  await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      subscription_plan: planId,
      subscription_status: 'active',
      subscription_stripe_id: subscriptionId,
      subscription_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('uuid', user.uuid);

  await supabaseAdmin
    .from('subscription_orders')
    .insert({
      user_uuid: user.uuid,
      order_type: 'renewal',
      plan_id: planId,
      billing_cycle: billingCycle,
      amount_cents: invoice.amount_paid || 0,
      currency: (invoice.currency || 'usd').toUpperCase(),
      credits_included: creditsToGrant,
      status: 'completed',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
      stripe_payment_intent_id: typeof (invoice as any).payment_intent === 'string'
        ? (invoice as any).payment_intent
        : (invoice as any).payment_intent?.id,
      period_start: periodStart,
      period_end: periodEnd,
      completed_at: new Date().toISOString(),
      metadata: {
        invoice_id: invoice.id,
        billing_reason: billingReason,
      },
    });

  await supabaseAdmin
    .from('subscription_changes')
    .insert({
      user_uuid: user.uuid,
      from_plan: user.subscription_plan || planId,
      to_plan: planId,
      change_type: 'renewal',
      credits_before: user.credits_remaining || 0,
      credits_after: creditSnapshot.total,
      credits_adjustment: creditsToGrant,
      reason: `Subscription renewed for ${planId} ${billingCycle}`,
      metadata: {
        invoice_id: invoice.id,
        subscription_id: subscriptionId,
      },
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    console.error('[WEBHOOK] Missing subscription ID on invoice.payment_failed:', {
      invoiceId: invoice.id,
      billingReason: (invoice as any).billing_reason,
    });
    return;
  }

  const shouldCleanup = await cancelStripeSubscriptionAfterPaymentFailure(subscriptionId);
  if (!shouldCleanup) {
    return;
  }

  await handleSubscriptionCanceled(subscriptionId);

  console.warn('[WEBHOOK] Canceled subscription after failed invoice:', {
    invoiceId: invoice.id,
    subscriptionId,
    billingReason: (invoice as any).billing_reason,
  });
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

    const dbStatus = subscription.status === 'active' || subscription.status === 'trialing'
      ? 'active'
      : subscription.status === 'past_due'
        ? 'past_due'
        : 'inactive';

    await updateUser(userUuid, {
      subscription_stripe_id: subscription.id,
      subscription_status: dbStatus,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      const shouldCleanup = await cancelStripeSubscriptionAfterPaymentFailure(subscription.id);
      if (!shouldCleanup) {
        return;
      }
      await handleSubscriptionCanceled(subscription.id);
      console.warn(`[WEBHOOK] Subscription ${subscription.id} became ${subscription.status} and was cancelled immediately`);
      return;
    }

    const { updateUser } = await import('@/services/user');
    const { supabaseAdmin, TABLES } = await import('@/lib/supabase');

    if (subscription.status === 'active' && subscription.current_period_end) {
      // 通过 metadata 或 subscription_stripe_id 查找用户
      let userUuid: string | undefined = subscription.metadata?.user_uuid;
      if (!userUuid) {
        const { data: user } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('uuid')
          .eq('subscription_stripe_id', subscription.id)
          .single();
        userUuid = user?.uuid;
      } else {
        const { data: user } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('uuid, subscription_stripe_id')
          .eq('uuid', userUuid)
          .single();

        if (user?.subscription_stripe_id !== subscription.id) {
          console.warn('[WEBHOOK] Skipping subscription active update because user is no longer linked:', {
            userUuid,
            subscriptionId: subscription.id,
            linkedSubscriptionId: user?.subscription_stripe_id,
          });
          return;
        }
      }

      if (userUuid) {
        const updateData: Record<string, string> = {
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        // cancel_at_period_end: true 表示期末取消，把 DB 状态提前置为 cancelled
        // subscription_stripe_id 和 subscription_plan 保留，确保期末前服务正常
        // 且下次再点取消时仍能找到 stripe_id 发起立即取消
        if (subscription.cancel_at_period_end) {
          updateData.subscription_status = 'cancelled';
          console.log(`[WEBHOOK] Subscription ${subscription.id} set to cancel at period end, marking DB as cancelled`);
        } else {
          updateData.subscription_status = 'active';
        }

        await updateUser(userUuid, updateData);
      }
    }

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
    const { isMissingColumnError } = await import('@/lib/supabase-schema-compat');

    let { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, subscription_plan, subscription_status, credits_remaining, credits_other_balance, credits_monthly_balance')
      .eq('subscription_stripe_id', subscriptionId)
      .single();

    if (isMissingColumnError(error)) {
      const legacyResult = await supabaseAdmin
        .from(TABLES.USERS)
        .select('uuid, email, subscription_plan, subscription_status, credits_remaining')
        .eq('subscription_stripe_id', subscriptionId)
        .single();

      user = legacyResult.data as any;
      error = legacyResult.error;
    }

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
    const retainedCredits = user.credits_other_balance ?? Math.max(0, currentCredits - (user.credits_monthly_balance || 0));
    const currentPlan = user.subscription_plan;

    await updateUser(user.uuid, {
      subscription_status: 'cancelled',
      subscription_plan: 'free',
      subscription_stripe_id: null,
      credits_monthly_total: 0,
      credits_monthly_balance: 0,
      credits_other_balance: retainedCredits,
      credits_next_reset_at: null,
      credits_remaining: retainedCredits,
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
        credits_after: retainedCredits,
        credits_adjustment: retainedCredits - currentCredits,
        reason: 'Subscription canceled - monthly credits expired, other credits retained',
        metadata: {
          canceled_subscription_id: subscriptionId,
          monthly_credits_expired: Math.max(0, currentCredits - retainedCredits),
          credits_retained: retainedCredits,
        },
      });

  } catch (error: any) {
    console.error('[WEBHOOK] Error in handleSubscriptionCanceled:', error);
    throw error;
  }
}

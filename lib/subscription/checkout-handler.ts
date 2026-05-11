/**
 * 简化的Checkout处理器（参考iMedio）
 * 直接更新用户积分和订阅状态，不使用复杂的subscription表
 */

import type Stripe from 'stripe';
import { getUserByUuid, updateUser } from '@/services/user';
import { getIsoTimestr } from '@/lib/time';
import { supabaseAdmin } from '@/lib/supabase';
import stripe from './stripe-config';

// 简化的套餐积分配置（参考iMideo）
const PLAN_CREDITS: Record<string, number> = {
  'pro': 1500,      // Pro套餐：1500积分/月
  'premium': 3500,  // Premium套餐：3500积分/月
};

/**
 * 处理Stripe checkout session完成事件
 * 参考iMedio的简单逻辑：直接更新用户状态和积分
 * ✅ 修复：同时更新订单状态和 Stripe Subscription ID
 */
export async function handleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  try {
    // 检查支付状态
    if (session.payment_status !== 'paid') {
      console.log('[CHECKOUT] Payment not completed, skipping');
      return;
    }

    // 从 subscription mode 获取 metadata
    let userUuid: string | undefined;
    let planId: string | undefined;
    let billingCycle: string | undefined;

    // 先尝试从 session.metadata 获取
    if (session.metadata && Object.keys(session.metadata).length > 0) {
      userUuid = session.metadata.user_uuid;
      planId = session.metadata.plan_id;
      billingCycle = session.metadata.billing_cycle;
    }

    // 如果 session.metadata 为空，从 subscription 获取
    if (!userUuid && session.subscription) {
      const subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription as Stripe.Subscription;
      userUuid = subscription.metadata?.user_uuid;
      planId = subscription.metadata?.plan_id;
      billingCycle = subscription.metadata?.billing_cycle;
    }

    if (!userUuid || !planId) {
      console.error('[CHECKOUT] Missing required metadata:', { userUuid, planId });
      return;
    }

    // ✅ 获取 subscription ID
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) {
      console.error('[CHECKOUT] No subscription ID in session');
      return;
    }

    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription as Stripe.Subscription;

    const periodStart = subscription?.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    console.log('[CHECKOUT] Processing payment:', {
      userUuid,
      planId,
      billingCycle,
      subscriptionId,
      sessionId: session.id,
    });

    // 先把 pending 订单声明为 processing。只有成功声明到订单的 webhook 才能发积分。
    let { data: updatedOrder, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'processing',
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id, // 确保记录 session ID
        period_start: periodStart,
        period_end: periodEnd,
      })
      .eq('user_uuid', userUuid)
      .eq('stripe_checkout_session_id', session.id)
      .eq('status', 'pending')
      .select('id, user_uuid, plan_id, billing_cycle, credits_included, status');

    if (orderError) {
      console.error('[CHECKOUT] Error claiming order by session ID:', orderError);
      throw orderError;
    }

    if (!updatedOrder || updatedOrder.length === 0) {
      const { data: existingOrder, error: existingError } = await supabaseAdmin
        .from('subscription_orders')
        .select('id, user_uuid, plan_id, billing_cycle, credits_included, status')
        .eq('user_uuid', userUuid)
        .eq('stripe_checkout_session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingError) {
        console.error('[CHECKOUT] Error checking existing order:', existingError);
        throw existingError;
      }

      if (existingOrder?.[0]?.status === 'completed') {
        console.log(`[CHECKOUT] Session ${session.id} already completed, skipping duplicate webhook`);
        return;
      }

      if (existingOrder?.[0]?.status === 'processing') {
        throw new Error(`Checkout session ${session.id} is already being processed`);
      }
    }

    // 如果没有匹配到，可能是因为 stripe_checkout_session_id 为 NULL
    // 尝试用 stripe_customer_id + 时间范围 + plan/cycle 匹配最近的 pending 订单
    if (!updatedOrder || updatedOrder.length === 0) {
      console.warn('[CHECKOUT] No order found with session ID, trying customer ID fallback');

      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (stripeCustomerId && billingCycle) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const fallbackResult = await supabaseAdmin
          .from('subscription_orders')
          .update({
            status: 'processing',
            stripe_subscription_id: subscriptionId,
            stripe_checkout_session_id: session.id,
            stripe_customer_id: stripeCustomerId,
            period_start: periodStart,
            period_end: periodEnd,
          })
          .eq('user_uuid', userUuid)
          .eq('stripe_customer_id', stripeCustomerId)
          .eq('plan_id', planId)
          .eq('billing_cycle', billingCycle)
          .eq('status', 'pending')
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .select('id, user_uuid, plan_id, billing_cycle, credits_included, status');

        updatedOrder = fallbackResult.data;
        orderError = fallbackResult.error;

        if (fallbackResult.error) {
          console.error('[CHECKOUT] Error claiming order via fallback:', fallbackResult.error);
          throw fallbackResult.error;
        }

        if (fallbackResult.data && fallbackResult.data.length > 0) {
          console.log(`✅ [CHECKOUT] Order claimed via fallback: ${fallbackResult.data[0].id}`);
        }
      }
    }

    const order = updatedOrder?.[0];
    if (!order) {
      throw new Error(`No pending order found for checkout session ${session.id}`);
    }

    const user = await getUserByUuid(userUuid);
    if (!user) {
      console.error('[CHECKOUT] User not found:', userUuid);
      throw new Error(`User not found: ${userUuid}`);
    }

    const orderPlanId = order.plan_id || planId;
    const orderBillingCycle = order.billing_cycle || billingCycle;
    const baseCredits = PLAN_CREDITS[orderPlanId] || 0;
    if (baseCredits === 0) {
      throw new Error(`Unknown plan: ${orderPlanId}`);
    }

    const creditsToAdd = order.credits_included || (orderBillingCycle === 'annual' ? baseCredits * 12 : baseCredits);

    const { data: newBalance, error: creditsError } = await supabaseAdmin.rpc('update_user_credits_balance', {
      p_user_uuid: userUuid,
      p_credits_change: creditsToAdd,
      p_transaction_type: 'earned',
      p_description: `Credits granted for ${orderPlanId} ${orderBillingCycle} subscription`,
      p_metadata: {
        checkout_session_id: session.id,
        subscription_id: subscriptionId,
        order_id: order.id,
        plan_id: orderPlanId,
        billing_cycle: orderBillingCycle,
      },
    });

    if (creditsError) {
      console.error('[CHECKOUT] Failed to grant subscription credits:', creditsError);
      throw creditsError;
    }

    await updateUser(userUuid, {
      subscription_plan: orderPlanId,
      subscription_status: 'active',
      subscription_stripe_id: subscriptionId,
      subscription_period_end: periodEnd,
      credits_monthly_total: typeof newBalance === 'number' ? newBalance : undefined,
    });

    await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'completed',
        completed_at: getIsoTimestr(),
      })
      .eq('id', order.id)
      .eq('status', 'processing');

    await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_uuid: userUuid,
        from_plan: user.subscription_plan || 'free',
        to_plan: orderPlanId,
        change_type: 'new_subscription',
        credits_before: user.credits_remaining || 0,
        credits_after: typeof newBalance === 'number' ? newBalance : (user.credits_remaining || 0) + creditsToAdd,
        credits_adjustment: creditsToAdd,
        order_id: order.id,
        reason: `New ${orderPlanId} ${orderBillingCycle} subscription`,
        metadata: {
          checkout_session_id: session.id,
          subscription_id: subscriptionId,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        },
      });

    console.log(`✅ [CHECKOUT] User updated: ${userUuid}, +${creditsToAdd} credits, new balance: ${newBalance}`);

    return;

  } catch (error: any) {
    console.error('[CHECKOUT] Error handling checkout session:', error);
    throw error;
  }
}

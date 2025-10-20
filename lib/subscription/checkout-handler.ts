/**
 * 简化的Checkout处理器（参考iMedio）
 * 直接更新用户积分和订阅状态，不使用复杂的subscription表
 */

import Stripe from 'stripe';
import { getUserByUuid, updateUser } from '@/services/user';
import { getIsoTimestr } from '@/lib/time';

// 简化的套餐积分配置（参考iMideo）
const PLAN_CREDITS: Record<string, number> = {
  'lite': 300,      // Lite套餐：300积分
  'pro': 2000,      // Pro套餐：2000积分
  'premium': 5000,  // Premium套餐：5000积分
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
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-09-30.acacia',
        typescript: true,
      });

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      userUuid = subscription.metadata?.user_uuid;
      planId = subscription.metadata?.plan_id;
      billingCycle = subscription.metadata?.billing_cycle;
    }

    if (!userUuid || !planId) {
      console.error('[CHECKOUT] Missing required metadata:', { userUuid, planId });
      return;
    }

    // ✅ 获取 subscription ID
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error('[CHECKOUT] No subscription ID in session');
      return;
    }

    console.log('[CHECKOUT] Processing payment:', {
      userUuid,
      planId,
      billingCycle,
      subscriptionId,
      sessionId: session.id,
    });

    // 获取用户信息
    const user = await getUserByUuid(userUuid);
    if (!user) {
      console.error('[CHECKOUT] User not found:', userUuid);
      return;
    }

    // 计算要增加的积分
    const creditsToAdd = PLAN_CREDITS[planId] || 0;
    if (creditsToAdd === 0) {
      console.error('[CHECKOUT] Unknown plan:', planId);
      return;
    }

    // 更新用户表
    const currentCredits = user.credits_remaining || 0;
    const newCreditsBalance = currentCredits + creditsToAdd;

    const updateData = {
      subscription_plan: planId,
      subscription_status: 'active',
      subscription_stripe_id: subscriptionId,
      credits_remaining: newCreditsBalance,
      updated_at: getIsoTimestr(),
    };

    await updateUser(userUuid, updateData);

    console.log(`✅ [CHECKOUT] User updated: ${userUuid}, credits: ${currentCredits} → ${newCreditsBalance}`);

    // ✅ 修复：更新订单状态
    const { supabaseAdmin, TABLES } = await import('@/lib/supabase');

    const { data: updatedOrder, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'completed',
        stripe_subscription_id: subscriptionId,
        completed_at: getIsoTimestr(),
      })
      .eq('user_uuid', userUuid)
      .eq('stripe_checkout_session_id', session.id)
      .eq('status', 'pending')
      .select();

    if (orderError) {
      console.error('[CHECKOUT] Error updating order:', orderError);
      // 不抛出错误，因为用户积分已经更新成功
    } else if (updatedOrder && updatedOrder.length > 0) {
      console.log(`✅ [CHECKOUT] Order completed: ${updatedOrder[0].id}`);
    } else {
      console.warn('[CHECKOUT] No pending order found to update:', {
        userUuid,
        sessionId: session.id,
      });
    }

  } catch (error: any) {
    console.error('[CHECKOUT] Error handling checkout session:', error);
    throw error;
  }
}
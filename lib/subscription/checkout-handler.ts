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
 */
export async function handleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  try {
    // 检查支付状态
    if (session.payment_status !== 'paid') {
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
      console.error('[CHECKOUT] Missing required metadata');
      return;
    }

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
      credits_remaining: newCreditsBalance,
      updated_at: getIsoTimestr(),
    };

    await updateUser(userUuid, updateData);

  } catch (error: any) {
    console.error('[CHECKOUT] Error handling checkout session:', error);
    throw error;
  }
}
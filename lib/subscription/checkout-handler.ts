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
    console.log('🔔 Processing checkout.session.completed:', session.id);

    // 检查支付状态
    if (session.payment_status !== 'paid') {
      console.log('❌ Payment not completed:', session.payment_status);
      return;
    }

    // 从metadata获取用户信息
    const userUuid = session.metadata?.user_uuid;
    const planId = session.metadata?.plan_id;
    const billingCycle = session.metadata?.billing_cycle;

    if (!userUuid || !planId) {
      console.error('❌ Missing metadata:', { userUuid, planId, billingCycle });
      return;
    }

    console.log('📝 Processing payment for user:', { userUuid, planId, billingCycle });

    // 获取用户信息
    const user = await getUserByUuid(userUuid);
    if (!user) {
      console.error('❌ User not found:', userUuid);
      return;
    }

    // 计算要增加的积分
    const creditsToAdd = PLAN_CREDITS[planId] || 0;
    if (creditsToAdd === 0) {
      console.error('❌ Unknown plan:', planId);
      return;
    }

    // 🔥 简化版：直接更新用户表，参考iMedio模式
    const currentCredits = user.credits_remaining || 0;
    const newCreditsBalance = currentCredits + creditsToAdd;

    const updateData = {
      subscription_plan: planId,
      subscription_status: 'active',
      credits_remaining: newCreditsBalance,
      updated_at: getIsoTimestr(),
    };

    await updateUser(userUuid, updateData);

    console.log('✅ Checkout processed successfully:', {
      userUuid,
      planId,
      previousCredits: currentCredits,
      addedCredits: creditsToAdd,
      newCreditsBalance,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('❌ Error handling checkout session:', error);
    throw error;
  }
}
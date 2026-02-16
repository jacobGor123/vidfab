/**
 * VidFab订阅服务
 * 整合Stripe支付和Credits管理的核心业务逻辑
 */

import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase';
import { CreditsManager } from './credits-manager';
import {
  createOrGetStripeCustomer,
  createCheckoutSession,
  getPlanFromStripePriceId,
  cancelSubscription,
  getSubscriptionDetails,
  createCustomerPortalSession,
  validateCouponCode,
} from './stripe-config';
import { SUBSCRIPTION_PLANS, getPlanConfig } from './pricing-config';
import type {
  PlanId,
  BillingCycle,
  SubscriptionOrder,
  UserSubscription,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SubscriptionStatusResponse,
} from './types';

export class SubscriptionService {
  private creditsManager: CreditsManager;

  constructor() {
    this.creditsManager = new CreditsManager();
  }

  /**
   * 创建checkout会话
   */
  async createCheckoutSession(
    userUuid: string,
    request: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const { plan_id, billing_cycle, success_url, cancel_url, coupon_code } = request;

      // 验证计划
      if (plan_id === 'free') {
        return {
          success: false,
          error: 'Cannot create checkout session for free plan',
        };
      }

      const planConfig = getPlanConfig(plan_id);
      if (!planConfig) {
        return {
          success: false,
          error: 'Invalid plan selected',
        };
      }

      // 验证优惠券码（如果提供）
      let promotionCodeId: string | undefined;
      let couponInfo: {
        code: string;
        discountAmount?: number;
        discountPercent?: number;
      } | undefined;

      if (coupon_code) {
        const couponValidation = await validateCouponCode(coupon_code);
        if (!couponValidation.valid) {
          return {
            success: false,
            error: couponValidation.error || 'Invalid coupon code',
          };
        }
        promotionCodeId = couponValidation.promotionCodeId;
        couponInfo = {
          code: coupon_code,
          discountAmount: couponValidation.discountAmount,
          discountPercent: couponValidation.discountPercent,
        };
      }

      // 获取用户信息
      const { data: user, error: userError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('email, nickname')
        .eq('uuid', userUuid)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 创建或获取Stripe客户
      const stripeCustomer = await createOrGetStripeCustomer(
        user.email,
        user.nickname,
        { user_uuid: userUuid }
      );

      // 准备动态产品信息
      const planName = `VidFab ${planConfig.name} - ${billing_cycle === 'monthly' ? 'Monthly' : 'Annual'}`;
      const amount = planConfig.price[billing_cycle];

      // 创建订单记录
      const { data: order, error: orderError } = await supabaseAdmin
        .from('subscription_orders')
        .insert({
          user_uuid: userUuid,
          order_type: 'subscription',
          plan_id,
          billing_cycle,
          amount_cents: amount,
          credits_included: billing_cycle === 'annual' ? planConfig.credits * 12 : planConfig.credits,
          status: 'pending',
          stripe_customer_id: stripeCustomer.id,
          metadata: {
            plan_name: planConfig.name,
            dynamic_product_name: planName,
            amount_cents: amount,
            ...(couponInfo && { coupon: couponInfo }), // 记录优惠券信息
          },
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return {
          success: false,
          error: 'Failed to create order',
        };
      }

      // 创建Stripe checkout会话 - 使用动态产品创建
      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        planName,
        amount,
        currency: 'usd',
        billingCycle: billing_cycle,
        successUrl: success_url || `${process.env.NEXT_PUBLIC_APP_URL}/studio/plans?payment_success=true&session_id={CHECKOUT_SESSION_ID}&plan=${plan_id}`,
        cancelUrl: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        userUuid,
        planId: plan_id,
        promotionCodeId, // 传递优惠券 Promotion Code ID
      });

      // 更新订单记录
      await supabaseAdmin
        .from('subscription_orders')
        .update({
          stripe_checkout_session_id: session.id,
          metadata: {
            ...order.metadata,
            checkout_session_id: session.id,
            checkout_url: session.url,
          },
        })
        .eq('id', order.id);

      return {
        success: true,
        checkout_url: session.url!,
        session_id: session.id,
      };

    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error.message || 'Failed to create checkout session',
      };
    }
  }

  /**
   * 处理订阅创建成功 - 修复版本（参考iMideo优秀设计）
   */
  async handleSubscriptionCreated(
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    userUuid: string,
    planId: PlanId,
    billingCycle: BillingCycle
  ): Promise<void> {
    try {
      const planConfig = getPlanConfig(planId);
      const creditsToGrant = billingCycle === 'annual' ? planConfig.credits * 12 : planConfig.credits;

      // ✅ 修复1: 先获取用户当前积分和状态（参考iMideo设计）
      const { data: currentUser, error: userError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('credits_remaining, subscription_plan')
        .eq('uuid', userUuid)
        .single();

      if (userError || !currentUser) {
        console.error('User not found during subscription creation:', userUuid, userError);
        throw new Error(`User not found: ${userUuid}`);
      }

      const currentCredits = currentUser.credits_remaining || 0;
      const currentPlan = currentUser.subscription_plan || 'free';

      // ✅ 修复2: 累加积分而不是覆盖（关键修复）
      const newCreditsBalance = currentCredits + creditsToGrant;

      console.log(`💰 Credits calculation for user ${userUuid}:`, {
        currentCredits,
        creditsToGrant,
        newCreditsBalance,
        planId,
        billingCycle
      });

      // 获取Stripe订阅详情
      const subscription = await getSubscriptionDetails(stripeSubscriptionId);

      // ✅ 修复3: 分离订阅状态更新和积分增加（参考iMideo设计）
      // 3.1 更新用户订阅状态（不包含积分字段）
      await supabaseAdmin
        .from(TABLES.USERS)
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_stripe_id: stripeSubscriptionId,
          credits_remaining: newCreditsBalance, // ✅ 使用累加后的积分
          credits_monthly_total: newCreditsBalance, // ✅ 设置本月开始时的总积分
          updated_at: new Date().toISOString(),
        })
        .eq('uuid', userUuid);

      // 3.2 更新订单状态
      await supabaseAdmin
        .from('subscription_orders')
        .update({
          status: 'completed',
          stripe_subscription_id: stripeSubscriptionId,
          period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', stripeCustomerId)
        .eq('status', 'pending');

      // ✅ 修复4: 使用准确的积分变更记录（参考iMideo的increaseCredits）
      await supabaseAdmin.rpc('update_user_credits_balance', {
        p_user_uuid: userUuid,
        p_credits_change: creditsToGrant,
        p_transaction_type: 'earned',
        p_description: `Credits granted for ${planId} ${billingCycle} subscription`,
        p_metadata: {
          subscription_id: stripeSubscriptionId,
          plan_id: planId,
          billing_cycle: billingCycle,
          credits_granted: creditsToGrant,
          previous_credits: currentCredits,
          new_total_credits: newCreditsBalance,
        },
      });

      // ✅ 修复5: 记录准确的积分变更（使用实际的before/after值）
      await supabaseAdmin
        .from('subscription_changes')
        .insert({
          user_uuid: userUuid,
          from_plan: currentPlan, // ✅ 使用实际的当前套餐
          to_plan: planId,
          change_type: 'new_subscription',
          credits_before: currentCredits, // ✅ 使用实际的原有积分
          credits_after: newCreditsBalance, // ✅ 使用累加后的积分
          credits_adjustment: creditsToGrant,
          reason: `New ${planId} ${billingCycle} subscription`,
          metadata: {
            subscription_id: stripeSubscriptionId,
            billing_cycle: billingCycle,
            stripe_customer_id: stripeCustomerId,
          },
        });

      console.log(`✅ Subscription created successfully for user ${userUuid}:`, {
        plan: planId,
        billingCycle,
        creditsChange: `${currentCredits} → ${newCreditsBalance} (+${creditsToGrant})`,
        subscriptionId: stripeSubscriptionId
      });

    } catch (error: any) {
      console.error('❌ Error handling subscription creation:', error);
      throw error;
    }
  }

  /**
   * 处理订阅取消
   * ✅ 修复：取消订阅时保留用户已购买的积分，不重置
   */
  async handleSubscriptionCanceled(stripeSubscriptionId: string): Promise<void> {
    try {
      // 🔥 安全获取用户信息，避免406错误
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('*')  // 使用通配符避免字段约束问题
        .eq('subscription_stripe_id', stripeSubscriptionId)
        .single();

      if (error || !user) {
        console.error('User not found for canceled subscription:', stripeSubscriptionId);
        return;
      }

      const currentCredits = user.credits_remaining || 0;

      // ✅ 修复：只更新订阅状态，保留用户已购买的积分
      await supabaseAdmin
        .from(TABLES.USERS)
        .update({
          subscription_plan: 'free',
          subscription_status: 'canceled', // 统一使用 'canceled' 而非 'cancelled'
          subscription_stripe_id: null,
          // ❌ 删除：credits_remaining: 50, // 不再重置积分！
          updated_at: new Date().toISOString(),
        })
        .eq('uuid', user.uuid);

      // ✅ 修复：记录订阅变更时，积分保持不变
      await supabaseAdmin
        .from('subscription_changes')
        .insert({
          user_uuid: user.uuid,
          from_plan: user.subscription_plan,
          to_plan: 'free',
          change_type: 'cancellation',
          credits_before: currentCredits,
          credits_after: currentCredits, // ✅ 积分保持不变
          credits_adjustment: 0, // ✅ 没有积分调整
          reason: 'Subscription canceled - credits retained',
          metadata: {
            canceled_subscription_id: stripeSubscriptionId,
            credits_retained: currentCredits,
          },
        });

      console.log(`✅ Subscription canceled for user ${user.uuid} - Credits retained: ${currentCredits}`);

    } catch (error: any) {
      console.error('Error handling subscription cancellation:', error);
      throw error;
    }
  }

  /**
   * 处理订阅更新
   */
  async handleSubscriptionUpdated(
    stripeSubscriptionId: string,
    newPriceId: string
  ): Promise<void> {
    try {
      const planInfo = getPlanFromStripePriceId(newPriceId);
      if (!planInfo) {
        console.error('Unknown price ID:', newPriceId);
        return;
      }

      const { planId, billingCycle } = planInfo;
      const planConfig = getPlanConfig(planId);

      // 🔥 安全获取用户信息，避免406错误
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('*')  // 使用通配符避免字段约束问题
        .eq('subscription_stripe_id', stripeSubscriptionId)
        .single();

      if (error || !user) {
        console.error('User not found for updated subscription:', stripeSubscriptionId);
        return;
      }

      const oldPlan = user.subscription_plan as PlanId;
      const creditsToGrant = billingCycle === 'annual' ? planConfig.credits * 12 : planConfig.credits;

      // 累加积分（按用户要求）
      const newCreditsBalance = user.credits_remaining + creditsToGrant;

      // 更新用户订阅
      await supabaseAdmin
        .from(TABLES.USERS)
        .update({
          subscription_plan: planId,
          credits_remaining: newCreditsBalance,
          credits_monthly_total: newCreditsBalance, // ✅ 更新本月总积分
          updated_at: new Date().toISOString(),
        })
        .eq('uuid', user.uuid);

      // 记录积分发放
      await supabaseAdmin.rpc('update_user_credits_balance', {
        p_user_uuid: user.uuid,
        p_credits_change: creditsToGrant,
        p_transaction_type: 'earned',
        p_description: `Credits granted for subscription upgrade to ${planId}`,
        p_metadata: {
          subscription_id: stripeSubscriptionId,
          old_plan: oldPlan,
          new_plan: planId,
          billing_cycle: billingCycle,
        },
      });

      // 记录订阅变更
      await supabaseAdmin
        .from('subscription_changes')
        .insert({
          user_uuid: user.uuid,
          from_plan: oldPlan,
          to_plan: planId,
          change_type: oldPlan === 'free' ? 'new_subscription' : (planId > oldPlan ? 'upgrade' : 'downgrade'),
          credits_before: user.credits_remaining,
          credits_after: newCreditsBalance,
          credits_adjustment: creditsToGrant,
          reason: `Subscription updated from ${oldPlan} to ${planId}`,
          metadata: {
            subscription_id: stripeSubscriptionId,
            billing_cycle: billingCycle,
          },
        });

      console.log(`Subscription updated for user ${user.uuid}: ${oldPlan} -> ${planId}`);

    } catch (error: any) {
      console.error('Error handling subscription update:', error);
      throw error;
    }
  }

  /**
   * 获取用户订阅状态 - 重构版本（参考iMideo简洁设计）
   */
  async getUserSubscriptionStatus(userUuid: string): Promise<SubscriptionStatusResponse> {
    try {
      // ✅ 简化1: 直接获取用户完整信息（参考iMideo设计）
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('uuid, email, created_at, updated_at, subscription_plan, subscription_status, subscription_stripe_id, credits_remaining, credits_monthly_total')
        .eq('uuid', userUuid)
        .single();

      if (error || !user) {
        console.warn('User not found, returning default free plan:', userUuid);
        return this.getDefaultFreeStatus(userUuid);
      }

      // ✅ 简化2: 使用iMideo风格的状态判断
      const currentPlan = this.normalizePlanId(user.subscription_plan || 'free');
      const creditsRemaining = user.credits_remaining || 0;
      const subscriptionStatus = user.subscription_status || 'active';

      // ✅ 简化3: 验证订阅是否仍然有效（参考iMideo的getUserActiveSubscription）
      let isActive = false;
      let autoRenew = true; // 默认开启自动续订

      // 判断订阅是否活跃的逻辑：
      // 1. 如果有积分且是付费套餐，应该是活跃的
      // 2. 如果有Stripe ID且状态为active，是活跃的
      // 3. 如果状态明确为active，是活跃的
      if (currentPlan !== 'free' && creditsRemaining > 0) {
        // 付费套餐且还有积分，认为是活跃的
        isActive = true;
        autoRenew = !user.subscription_stripe_id; // 没有Stripe ID的情况下默认不自动续订
      } else if (user.subscription_stripe_id && subscriptionStatus === 'active') {
        // 有Stripe订阅且状态为active
        isActive = true;
        autoRenew = true;
      } else if (subscriptionStatus === 'active' && currentPlan !== 'free') {
        // 状态明确为active的付费套餐
        isActive = true;
        autoRenew = false;
      } else if (subscriptionStatus === 'cancelled') {
        // 已取消的订阅
        isActive = false;
        autoRenew = false;
      }

      // ✅ 简化4: 构建响应（参考iMideo的getUserCurrentPlan）
      const planConfig = getPlanConfig(currentPlan);
      const subscription: UserSubscription = {
        uuid: user.uuid,
        plan_id: currentPlan,
        status: isActive ? 'active' : (subscriptionStatus === 'cancelled' ? 'cancelled' : 'expired'),
        billing_cycle: 'monthly', // 简化：默认月付，可以从Stripe获取详细信息
        credits_remaining: creditsRemaining,
        credits_total: planConfig.credits,
        credits_monthly_total: user.credits_monthly_total, // 本月可用总积分
        period_start: user.created_at,
        period_end: user.updated_at,
        stripe_subscription_id: user.subscription_stripe_id,
        auto_renew: autoRenew,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      console.log(`📊 User subscription status for ${userUuid}:`, {
        plan: currentPlan,
        status: isActive ? 'active' : 'expired',
        credits: creditsRemaining
      });

      return {
        success: true,
        subscription,
        credits_remaining: creditsRemaining,
        plan_limits: planConfig.limits,
      };

    } catch (error: any) {
      console.error('Error getting subscription status:', error);
      return this.getDefaultFreeStatus(userUuid);
    }
  }

  /**
   * 获取默认免费状态（参考iMideo设计）
   */
  private getDefaultFreeStatus(userUuid: string): SubscriptionStatusResponse {
    const planConfig = getPlanConfig('free');
    const defaultSubscription: UserSubscription = {
      uuid: userUuid,
      plan_id: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      credits_remaining: planConfig.credits,
      credits_total: planConfig.credits,
      period_start: new Date().toISOString(),
      period_end: new Date().toISOString(),
      stripe_subscription_id: null,
      auto_renew: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      subscription: defaultSubscription,
      credits_remaining: planConfig.credits,
      plan_limits: planConfig.limits,
    };
  }

  /**
   * 标准化套餐ID（处理历史数据兼容性）
   */
  private normalizePlanId(planId: string): PlanId {
    const planMapping: Record<string, PlanId> = {
      'basic': 'free',
      'lite': 'pro', // ✅ 将旧的 lite 套餐映射到 pro
      'enterprise': 'premium',
      'pro': 'pro',
      'premium': 'premium',
      'free': 'free'
    };

    const normalized = planMapping[planId] || 'free';
    if (normalized !== planId) {
      console.log(`🔄 Normalized plan ID: ${planId} → ${normalized}`);
    }
    return normalized;
  }

  /**
   * 取消用户订阅
   * ✅ 修复：无论立即取消还是期末取消，都等待 webhook 处理状态更新
   */
  async cancelUserSubscription(
    userUuid: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<{ success: boolean; error?: string; cleaned?: boolean }> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('subscription_stripe_id, subscription_plan, subscription_status')
        .eq('uuid', userUuid)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 🔥 检查用户是否已经是免费计划
      if (user.subscription_plan === 'free' || user.subscription_status === 'cancelled') {
        console.log(`⚠️ User ${userUuid} is already on free plan or cancelled`);
        return {
          success: true, // ✅ 改为 true，因为目标状态已达成
          error: 'You are already on the free plan',
          cleaned: true,
        };
      }

      if (!user.subscription_stripe_id) {
        console.log(`⚠️ User ${userUuid} has no subscription_stripe_id but plan is ${user.subscription_plan}`);
        // 🔥 数据不一致：有付费计划但没有 Stripe ID，直接清理
        await this.cleanupOrphanedSubscription(userUuid);
        return {
          success: true, // ✅ 改为 true，因为已成功清理
          error: 'Invalid subscription state detected and fixed. Your account has been reset to free plan.',
          cleaned: true,
        };
      }

      console.log(`🔄 Canceling subscription for user ${userUuid}: ${user.subscription_stripe_id}`);

      try {
        // 🔥 关键修复：只调用 Stripe API，不直接修改数据库
        // 让 Stripe webhook 来处理状态更新，避免竞态条件
        await cancelSubscription(user.subscription_stripe_id, cancelAtPeriodEnd);

        console.log(`✅ Stripe cancellation request sent successfully`);
        console.log(`⏳ Waiting for webhook to update user status...`);

        return { success: true };

      } catch (stripeError: any) {
        console.error('Stripe API error:', stripeError);

        // 🔥 如果 Stripe 中找不到订阅，说明是孤儿数据，直接清理
        if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404) {
          console.log(`⚠️ Subscription ${user.subscription_stripe_id} not found in Stripe, cleaning up orphaned data`);
          await this.cleanupOrphanedSubscription(userUuid);
          return {
            success: true, // ✅ 改为 true，因为已成功清理
            error: 'Subscription not found in Stripe. Your account has been reset to free plan.',
            cleaned: true,
          };
        }

        throw stripeError;
      }

    } catch (error: any) {
      console.error('Error canceling subscription:', error);

      return {
        success: false,
        error: error.message || 'Failed to cancel subscription',
      };
    }
  }

  /**
   * 清理孤儿订阅数据（数据库有记录但 Stripe 中不存在）
   */
  private async cleanupOrphanedSubscription(userUuid: string): Promise<void> {
    try {
      console.log(`🧹 [CLEANUP] Starting cleanup for user ${userUuid}`);

      const { getIsoTimestr } = await import('@/lib/time');

      // 🔍 步骤1: 获取当前用户状态
      const { data: user, error: fetchError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('subscription_plan, subscription_status, subscription_stripe_id, credits_remaining')
        .eq('uuid', userUuid)
        .single();

      if (fetchError) {
        console.error(`❌ [CLEANUP] Failed to fetch user:`, fetchError);
        throw fetchError;
      }

      if (!user) {
        console.error(`❌ [CLEANUP] User not found: ${userUuid}`);
        throw new Error(`User not found: ${userUuid}`);
      }

      console.log(`📊 [CLEANUP] Current user state:`, {
        plan: user.subscription_plan,
        status: user.subscription_status,
        stripeId: user.subscription_stripe_id,
        credits: user.credits_remaining,
      });

      // 🔍 步骤2: 更新用户状态为免费计划
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from(TABLES.USERS)
        .update({
          subscription_plan: 'free',
          subscription_status: 'cancelled', // ✅ 修复：使用 'cancelled' (双L) 以匹配数据库约束
          subscription_stripe_id: null,
          updated_at: getIsoTimestr(),
        })
        .eq('uuid', userUuid)
        .select(); // ✅ 添加 select() 以返回更新后的数据

      if (updateError) {
        console.error(`❌ [CLEANUP] Failed to update user:`, updateError);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error(`❌ [CLEANUP] Update returned no rows for user: ${userUuid}`);
        throw new Error(`Failed to update user ${userUuid}`);
      }

      console.log(`✅ [CLEANUP] User updated successfully:`, updateResult[0]);

      // 🔍 步骤3: 记录变更到 subscription_changes 表
      try {
        const { error: changeError } = await supabaseAdmin
          .from('subscription_changes')
          .insert({
            user_uuid: userUuid,
            from_plan: user.subscription_plan,
            to_plan: 'free',
            change_type: 'cancellation', // ✅ 修复：使用 'cancellation' 以匹配数据库约束
            credits_before: user.credits_remaining || 0,
            credits_after: user.credits_remaining || 0,
            credits_adjustment: 0,
            reason: 'Cleaned up orphaned subscription data (not found in Stripe)',
            metadata: {
              cleanup_reason: 'stripe_subscription_not_found',
              previous_stripe_id: user.subscription_stripe_id,
            },
          });

        if (changeError) {
          console.error(`⚠️ [CLEANUP] Failed to record change (non-critical):`, changeError);
          // 不抛出错误，因为主要更新已经成功
        } else {
          console.log(`✅ [CLEANUP] Change recorded successfully`);
        }
      } catch (changeErr) {
        console.error(`⚠️ [CLEANUP] Exception recording change (non-critical):`, changeErr);
      }

      console.log(`🎉 [CLEANUP] Cleanup completed successfully for user ${userUuid}`);

    } catch (error: any) {
      console.error(`💥 [CLEANUP] Critical error during cleanup for user ${userUuid}:`, error);
      throw error;
    }
  }

  /**
   * 升级用户订阅
   */
  async upgradeSubscription(
    userUuid: string,
    newPlanId: PlanId,
    newBillingCycle: BillingCycle
  ): Promise<{ success: boolean; checkout_url?: string; error?: string }> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('*')  // 🔥 使用通配符避免字段约束问题
        .eq('uuid', userUuid)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const currentPlan = user.subscription_plan as PlanId || 'free';

      // 如果用户当前是免费计划，创建新订阅
      if (currentPlan === 'free' || !user.subscription_stripe_id) {
        return await this.createCheckoutSession(userUuid, {
          plan_id: newPlanId,
          billing_cycle: newBillingCycle,
        });
      }

      // 由于我们使用动态产品创建，升级需要创建新的checkout会话
      // 这样可以保持与新订阅流程的一致性
      return await this.createCheckoutSession(userUuid, {
        plan_id: newPlanId,
        billing_cycle: newBillingCycle,
      });

    } catch (error: any) {
      console.error('Error upgrading subscription:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 创建客户门户链接
   */
  async createPortalSession(
    userUuid: string,
    returnUrl?: string
  ): Promise<{ success: boolean; portal_url?: string; error?: string }> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('email')
        .eq('uuid', userUuid)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 获取或创建Stripe客户
      const stripeCustomer = await createOrGetStripeCustomer(user.email);

      // 创建门户会话
      const session = await createCustomerPortalSession(
        stripeCustomer.id,
        returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/account`
      );

      return {
        success: true,
        portal_url: session.url,
      };

    } catch (error: any) {
      console.error('Error creating portal session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
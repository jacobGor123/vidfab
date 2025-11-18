/**
 * VidFab Stripe配置和初始化
 */

import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS, STRIPE_PRODUCTS } from './pricing-config';
import type { PlanId, BillingCycle } from './types';

// 初始化Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
  typescript: true,
});

// Stripe产品和价格映射
export const STRIPE_PRICE_IDS = {
  lite: {
    monthly: process.env.STRIPE_PRICE_LITE_MONTHLY || 'price_lite_monthly',
    annual: process.env.STRIPE_PRICE_LITE_ANNUAL || 'price_lite_annual',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || 'price_premium_annual',
  },
} as const;

// Webhook配置
export const STRIPE_WEBHOOK_CONFIG = {
  endpoint_secret: process.env.STRIPE_WEBHOOK_SECRET!,
  events: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
  ] as const,
};

/**
 * 获取Stripe价格ID
 */
export function getStripePriceId(planId: PlanId, billingCycle: BillingCycle): string {
  if (planId === 'free') {
    throw new Error('Free plan does not have a Stripe price ID');
  }

  const priceId = STRIPE_PRICE_IDS[planId]?.[billingCycle];
  if (!priceId) {
    throw new Error(`No Stripe price ID found for plan: ${planId}, cycle: ${billingCycle}`);
  }

  return priceId;
}

/**
 * 根据Stripe价格ID获取计划信息
 */
export function getPlanFromStripePriceId(priceId: string): { planId: PlanId; billingCycle: BillingCycle } | null {
  for (const [planId, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    for (const [cycle, stripePriceId] of Object.entries(prices)) {
      if (stripePriceId === priceId) {
        return {
          planId: planId as PlanId,
          billingCycle: cycle as BillingCycle,
        };
      }
    }
  }
  return null;
}

/**
 * 创建或获取Stripe客户
 */
export async function createOrGetStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // 首先尝试查找现有客户
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // 创建新客户
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: metadata || {},
  });

  return customer;
}

/**
 * 创建Checkout会话 - 使用动态产品创建
 */
export async function createCheckoutSession({
  customerId,
  planName,
  amount,
  currency = 'usd',
  billingCycle,
  successUrl,
  cancelUrl,
  userUuid,
  planId,
  promotionCodeId,
}: {
  customerId: string;
  planName: string;
  amount: number;
  currency?: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
  userUuid: string;
  planId: PlanId;
  promotionCodeId?: string; // 可选的优惠券 Promotion Code ID
}): Promise<Stripe.Checkout.Session> {
  // 构建 session 配置
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: planName,
          },
          unit_amount: amount,
          recurring: {
            interval: billingCycle === 'monthly' ? 'month' : 'year',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        user_uuid: userUuid,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    },
    metadata: {
      user_uuid: userUuid,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  };

  // 如果有优惠券码，自动应用；否则显示输入框让用户手动输入
  if (promotionCodeId) {
    sessionConfig.discounts = [{
      promotion_code: promotionCodeId,
    }];
  } else {
    sessionConfig.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  return session;
}

/**
 * 验证并获取优惠券码的 Promotion Code ID
 * @param code - 优惠券码字符串（例如：SUMMER2024）
 * @returns 验证结果，包含是否有效、Promotion Code ID 和错误信息
 */
export async function validateCouponCode(code: string): Promise<{
  valid: boolean;
  promotionCodeId?: string;
  discountAmount?: number;
  discountPercent?: number;
  error?: string;
}> {
  try {
    // 查询 Stripe 中的 Promotion Code
    const promotionCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return {
        valid: false,
        error: 'Invalid or expired coupon code'
      };
    }

    const promotionCode = promotionCodes.data[0];

    // 检查优惠券是否还有使用次数
    if (promotionCode.max_redemptions &&
        promotionCode.times_redeemed >= promotionCode.max_redemptions) {
      return {
        valid: false,
        error: 'Coupon code has been fully redeemed'
      };
    }

    // 检查优惠券的有效期
    if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
      return {
        valid: false,
        error: 'Coupon code has expired'
      };
    }

    // 获取折扣信息
    const coupon = promotionCode.coupon;
    let discountAmount: number | undefined;
    let discountPercent: number | undefined;

    if (coupon.amount_off) {
      discountAmount = coupon.amount_off; // 固定金额折扣（分）
    }
    if (coupon.percent_off) {
      discountPercent = coupon.percent_off; // 百分比折扣
    }

    return {
      valid: true,
      promotionCodeId: promotionCode.id,
      discountAmount,
      discountPercent,
    };
  } catch (error) {
    console.error('Error validating coupon code:', error);
    return {
      valid: false,
      error: 'Failed to validate coupon code'
    };
  }
}

/**
 * 取消订阅
 */
export async function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
}

/**
 * 更新订阅计划
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!subscription.items.data[0]) {
    throw new Error('No subscription items found');
  }

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: metadata || {},
  });
}

/**
 * 获取订阅详情
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['customer', 'items.data.price'],
  });
}

/**
 * 获取客户的所有订阅
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.items.data.price'],
  });

  return subscriptions.data;
}

/**
 * 创建客户门户会话
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * 验证Webhook签名
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * 处理支付成功
 */
export async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('Payment succeeded:', paymentIntent.id);
  // 这里可以添加额外的支付成功处理逻辑
}

/**
 * 处理支付失败
 */
export async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('Payment failed:', paymentIntent.id);
  // 这里可以添加支付失败的处理逻辑，比如发送通知邮件
}

/**
 * 格式化金额（从美分转为美元）
 */
export function formatAmount(amountInCents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amountInCents / 100);
}

/**
 * 计算年付折扣
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): {
  savingsAmount: number;
  savingsPercentage: number;
} {
  const monthlyTotal = monthlyPrice * 12;
  const savingsAmount = monthlyTotal - annualPrice;
  const savingsPercentage = Math.round((savingsAmount / monthlyTotal) * 100);

  return {
    savingsAmount,
    savingsPercentage,
  };
}

export default stripe;
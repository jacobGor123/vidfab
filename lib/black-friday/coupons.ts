/**
 * Black Friday 2025 Coupon Configuration
 * 黑五优惠券配置 - 所有优惠券码需在 Stripe Dashboard 中预先创建
 */

export interface BlackFridayCoupon {
  code: string
  discount: number // 折扣百分比
  type: 'percentage' | 'fixed'
  planId: 'lite' | 'pro' | 'premium'
  billingCycle: 'monthly' | 'annual'
}

/**
 * 黑五优惠券映射表
 * 从环境变量读取优惠券码，方便管理和修改
 */
export const BLACK_FRIDAY_COUPONS: Record<'monthly' | 'annual', Record<'lite' | 'pro' | 'premium', BlackFridayCoupon>> = {
  monthly: {
    lite: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_LITE_MONTHLY || 'BF2025_LITE_10',
      discount: 10,
      type: 'percentage',
      planId: 'lite',
      billingCycle: 'monthly'
    },
    pro: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_PRO_MONTHLY || 'BF2025_PRO_20',
      discount: 20,
      type: 'percentage',
      planId: 'pro',
      billingCycle: 'monthly'
    },
    premium: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_PREMIUM_MONTHLY || 'BF2025_PREMIUM_10',
      discount: 10,
      type: 'percentage',
      planId: 'premium',
      billingCycle: 'monthly'
    }
  },
  annual: {
    lite: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_LITE_ANNUAL || 'BF2025_ANNUAL_LITE',
      discount: 20,
      type: 'percentage',
      planId: 'lite',
      billingCycle: 'annual'
    },
    pro: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_PRO_ANNUAL || 'BF2025_ANNUAL_PRO',
      discount: 20,
      type: 'percentage',
      planId: 'pro',
      billingCycle: 'annual'
    },
    premium: {
      code: process.env.NEXT_PUBLIC_BF2025_COUPON_PREMIUM_ANNUAL || 'BF2025_ANNUAL_PREMIUM',
      discount: 20,
      type: 'percentage',
      planId: 'premium',
      billingCycle: 'annual'
    }
  }
}

/**
 * 获取指定套餐的优惠券码
 */
export function getCouponCode(planId: 'lite' | 'pro' | 'premium', billingCycle: 'monthly' | 'annual'): string {
  return BLACK_FRIDAY_COUPONS[billingCycle][planId].code
}

/**
 * 获取指定套餐的折扣百分比
 */
export function getDiscount(planId: 'lite' | 'pro' | 'premium', billingCycle: 'monthly' | 'annual'): number {
  return BLACK_FRIDAY_COUPONS[billingCycle][planId].discount
}

/**
 * 计算折后价格（单位：美分）
 */
export function calculateDiscountedPrice(originalPrice: number, discount: number): number {
  return Math.floor(originalPrice * (1 - discount / 100))
}

/**
 * 计算节省金额（单位：美分）
 */
export function calculateSavings(originalPrice: number, discount: number): number {
  return originalPrice - calculateDiscountedPrice(originalPrice, discount)
}

/**
 * 检查黑五活动是否进行中
 */
export function isBlackFridayActive(): boolean {
  const enabled = process.env.NEXT_PUBLIC_BLACK_FRIDAY_ENABLED === 'true'
  if (!enabled) return false

  const endDate = process.env.NEXT_PUBLIC_BLACK_FRIDAY_END_DATE
  if (!endDate) return true // 如果没有设置结束日期，则认为一直有效

  const endTime = new Date(endDate).getTime()
  const now = Date.now()

  return now < endTime
}

/**
 * 获取黑五活动结束时间
 */
export function getBlackFridayEndDate(): Date | null {
  const endDate = process.env.NEXT_PUBLIC_BLACK_FRIDAY_END_DATE
  if (!endDate) return null

  return new Date(endDate)
}

/**
 * Stripe Coupon 创建指南（需要在 Stripe Dashboard 手动创建）
 *
 * 月付优惠券：
 * - BF2025_LITE_10:      10% OFF, Duration: Once, Active: Yes
 * - BF2025_PRO_20:       20% OFF, Duration: Once, Active: Yes
 * - BF2025_PREMIUM_10:   10% OFF, Duration: Once, Active: Yes
 *
 * 年付优惠券：
 * - BF2025_ANNUAL_LITE:     20% OFF, Duration: Once, Active: Yes
 * - BF2025_ANNUAL_PRO:      20% OFF, Duration: Once, Active: Yes
 * - BF2025_ANNUAL_PREMIUM:  20% OFF, Duration: Once, Active: Yes
 *
 * 创建步骤：
 * 1. 登录 Stripe Dashboard: https://dashboard.stripe.com/
 * 2. 进入 Products → Coupons
 * 3. 点击 "+ Create coupon"
 * 4. 配置优惠券参数（参考上述配置）
 * 5. 点击 "Create promotion code" 创建推广码
 */

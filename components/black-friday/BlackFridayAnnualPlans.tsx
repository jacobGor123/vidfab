"use client"

import { BlackFridayPlanCard, PlanFeature } from './BlackFridayPlanCard'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/pricing-config'
import { calculateDiscountedPrice, calculateSavings } from '@/lib/black-friday/coupons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const CDN_BASE = 'https://static.vidfab.ai/public/activity/black-friday-sale-2025'

export function BlackFridayAnnualPlans() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleCheckout = async (
    planId: 'lite' | 'pro' | 'premium',
    billingCycle: 'monthly' | 'annual',
    couponCode: string
  ) => {
    // 检查用户是否登录
    if (status === 'unauthenticated' || !session?.user) {
      // 保存当前页面到 callbackUrl，登录后返回
      const callbackUrl = encodeURIComponent('/black-friday-sale-2025')
      router.push(`/login?callbackUrl=${callbackUrl}`)
      return
    }

    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
          coupon_code: couponCode,
          cancel_url: `${window.location.origin}/black-friday-sale-2025`,
        }),
      })

      const data = await response.json()

      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        toast.error(`Failed to start checkout: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout. Please try again.')
    }
  }

  // Lite Plan (20% OFF for annual)
  const liteAnnualOriginal = SUBSCRIPTION_PLANS.lite.price.annual
  const liteDiscount = 20
  const liteAnnualDiscounted = calculateDiscountedPrice(liteAnnualOriginal, liteDiscount)
  const liteMonthlyEquivalent = Math.floor(liteAnnualDiscounted / 12)
  const liteSavings = calculateSavings(liteAnnualOriginal, liteDiscount)
  const liteFeatures: PlanFeature[] = [
    { text: '300 credits/month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models (veo3-fast)', included: true },
    { text: 'Faster generations', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Email support', included: true },
  ]

  // Pro Plan (20% OFF for annual)
  const proAnnualOriginal = SUBSCRIPTION_PLANS.pro.price.annual
  const proDiscount = 20
  const proAnnualDiscounted = calculateDiscountedPrice(proAnnualOriginal, proDiscount)
  const proMonthlyEquivalent = Math.floor(proAnnualDiscounted / 12)
  // 设计稿显示 Save $58/yr，向上取整保持对齐
  const proSavings = 5800
  const proFeatures: PlanFeature[] = [
    { text: '1000 credits/month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models', included: true },
    { text: 'Advanced effects library', included: true },
    { text: 'Faster generations', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Priority support', included: true },
  ]

  // Premium Plan (20% OFF for annual)
  const premiumAnnualOriginal = SUBSCRIPTION_PLANS.premium.price.annual
  const premiumDiscount = 20
  const premiumAnnualDiscounted = calculateDiscountedPrice(premiumAnnualOriginal, premiumDiscount)
  const premiumMonthlyEquivalent = Math.floor(premiumAnnualDiscounted / 12)
  // 设计稿显示 Save $197.97/yr，直接按设计稿金额展示
  const premiumSavings = 19797
  const premiumFeatures: PlanFeature[] = [
    { text: '2000 credits/month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models', included: true },
    { text: 'Advanced effects library', included: true },
    { text: 'Faster generations', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Dedicated support', included: true },
  ]

  return (
    <section id="annual-plans" className="py-10 md:py-20 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          {/* 桌面版标题图片 */}
          <div className="hidden md:block mx-auto mb-4" style={{ maxWidth: '1100px' }}>
            <img
              src={`${CDN_BASE}/annual-plan-card.webp`}
              alt="Annual Plans"
              className="mx-auto h-auto w-full"
            />
          </div>

          {/* 移动版标题图片 */}
          <div className="md:hidden mx-auto mb-4" style={{ maxWidth: '520px' }}>
            <img
              src={`${CDN_BASE}/annual-plan-card-mb.webp`}
              alt="Annual Plans"
              className="mx-auto h-auto w-full px-4"
            />
          </div>

          <p className="text-xl text-gray-300">
            Best Chance to Unlock VidFab Advanced Features!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {/* Lite Plan */}
          <BlackFridayPlanCard
            // Lite 卡片不展示右上角折扣角标
              planId="lite"
              planName="Lite"
              originalPrice={liteMonthlyEquivalent}
              discountedPrice={liteMonthlyEquivalent}
              discount={liteDiscount}
              billingCycle="annual"
              credits={SUBSCRIPTION_PLANS.lite.credits}
              features={liteFeatures}
              annualTotal={liteAnnualDiscounted}
              annualSavings={liteSavings}
              themeColor="cyan"
              saveColor="cyan"
              onCheckout={handleCheckout}
            />

          {/* Pro Plan */}
          <BlackFridayPlanCard
            // Pro 保留右上角折扣角标（喇叭）
              discountBadgeUrl={`${CDN_BASE}/pricing-card-discount-year.webp`}
              planId="pro"
              planName="Pro"
              originalPrice={proMonthlyEquivalent}
              discountedPrice={proMonthlyEquivalent}
              discount={proDiscount}
              billingCycle="annual"
              credits={SUBSCRIPTION_PLANS.pro.credits}
              features={proFeatures}
              annualTotal={proAnnualDiscounted}
              annualSavings={proSavings}
              highlighted
              themeColor="purple"
              saveColor="pink"
              onCheckout={handleCheckout}
            />

          {/* Premium Plan */}
          <BlackFridayPlanCard
            // Premium 卡片不展示右上角折扣角标
              planId="premium"
              planName="Premium"
              originalPrice={premiumMonthlyEquivalent}
              discountedPrice={premiumMonthlyEquivalent}
              discount={premiumDiscount}
              billingCycle="annual"
              credits={SUBSCRIPTION_PLANS.premium.credits}
              features={premiumFeatures}
              annualTotal={premiumAnnualDiscounted}
              annualSavings={premiumSavings}
              themeColor="cyan"
              saveColor="cyan"
              onCheckout={handleCheckout}
            />
        </div>
      </div>
    </section>
  )
}

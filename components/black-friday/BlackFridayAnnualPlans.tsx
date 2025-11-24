"use client"

import { BlackFridayPlanCard, PlanFeature } from './BlackFridayPlanCard'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/pricing-config'
import { calculateDiscountedPrice, calculateSavings } from '@/lib/black-friday/coupons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

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
    { text: 'Credits delivered every month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models (veo3-fast)', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Email support', included: true },
    { text: 'Cancel at anytime', included: true },
  ]

  // Pro Plan (20% OFF for annual)
  const proAnnualOriginal = SUBSCRIPTION_PLANS.pro.price.annual
  const proDiscount = 20
  const proAnnualDiscounted = calculateDiscountedPrice(proAnnualOriginal, proDiscount)
  const proMonthlyEquivalent = Math.floor(proAnnualDiscounted / 12)
  const proSavings = calculateSavings(proAnnualOriginal, proDiscount)
  const proFeatures: PlanFeature[] = [
    { text: '1000 credits/month', included: true },
    { text: 'Credits delivered every month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models', included: true },
    { text: 'Advanced effects library', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Priority support', included: true },
    { text: 'Cancel at anytime', included: true },
  ]

  // Premium Plan (20% OFF for annual)
  const premiumAnnualOriginal = SUBSCRIPTION_PLANS.premium.price.annual
  const premiumDiscount = 20
  const premiumAnnualDiscounted = calculateDiscountedPrice(premiumAnnualOriginal, premiumDiscount)
  const premiumMonthlyEquivalent = Math.floor(premiumAnnualDiscounted / 12)
  const premiumSavings = calculateSavings(premiumAnnualOriginal, premiumDiscount)
  const premiumFeatures: PlanFeature[] = [
    { text: '2000 credits/month', included: true },
    { text: 'Credits delivered every month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models', included: true },
    { text: 'Advanced effects library', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Dedicated support', included: true },
    { text: 'Cancel at anytime', included: true },
  ]

  return (
    <section id="annual-plans" className="py-20 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              20% OFF For All Annual Plans!
            </span>
          </h2>
          <p className="text-xl text-gray-300">
            Biggest Savings for Your AI Creations
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Lite Plan */}
          <BlackFridayPlanCard
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
            themeColor="blue"
            onCheckout={handleCheckout}
          />

          {/* Pro Plan */}
          <BlackFridayPlanCard
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
            themeColor="purple"
            onCheckout={handleCheckout}
          />

          {/* Premium Plan */}
          <BlackFridayPlanCard
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
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </section>
  )
}

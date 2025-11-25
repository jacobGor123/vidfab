"use client"

import { BlackFridayPlanCard, PlanFeature } from './BlackFridayPlanCard'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/pricing-config'
import { calculateDiscountedPrice } from '@/lib/black-friday/coupons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function BlackFridayMonthlyPlans() {
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

  // Lite Plan (10% OFF)
  const liteOriginalPrice = SUBSCRIPTION_PLANS.lite.price.monthly
  const liteDiscount = 10
  const liteDiscountedPrice = calculateDiscountedPrice(liteOriginalPrice, liteDiscount)
  const liteFeatures: PlanFeature[] = [
    { text: '300 credits/month', included: true },
    { text: 'Watermark-free', included: true },
    { text: 'Advanced AI models (veo3-fast)', included: true },
    { text: 'Faster generations', included: true },
    { text: 'Access to HD resolution (up to 1080P)', included: true },
    { text: '4 concurrent generation', included: true },
    { text: 'Email support', included: true },
  ]

  // Pro Plan (20% OFF - BEST CHOICE)
  const proOriginalPrice = SUBSCRIPTION_PLANS.pro.price.monthly
  const proDiscount = 20
  const proDiscountedPrice = calculateDiscountedPrice(proOriginalPrice, proDiscount)
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

  // Premium Plan (10% OFF)
  const premiumOriginalPrice = SUBSCRIPTION_PLANS.premium.price.monthly
  const premiumDiscount = 10
  const premiumDiscountedPrice = calculateDiscountedPrice(premiumOriginalPrice, premiumDiscount)
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
    <section id="monthly-plans" className="py-20 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              Up to 20% OFF
            </span>{' '}
            to Unlock VidFab Advanced Features!
          </h2>
          <p className="text-xl text-gray-300">
            Let's Experience the Power of AI Now!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Lite Plan */}
          <BlackFridayPlanCard
            planId="lite"
            planName="Lite"
            originalPrice={liteOriginalPrice}
            discountedPrice={liteDiscountedPrice}
            discount={liteDiscount}
            billingCycle="monthly"
            credits={SUBSCRIPTION_PLANS.lite.credits}
            features={liteFeatures}
            themeColor="blue"
            onCheckout={handleCheckout}
          />

          {/* Pro Plan - BEST CHOICE */}
          <BlackFridayPlanCard
            planId="pro"
            planName="Pro"
            originalPrice={proOriginalPrice}
            discountedPrice={proDiscountedPrice}
            discount={proDiscount}
            billingCycle="monthly"
            credits={SUBSCRIPTION_PLANS.pro.credits}
            features={proFeatures}
            highlighted
            themeColor="purple"
            onCheckout={handleCheckout}
          />

          {/* Premium Plan */}
          <BlackFridayPlanCard
            planId="premium"
            planName="Premium"
            originalPrice={premiumOriginalPrice}
            discountedPrice={premiumDiscountedPrice}
            discount={premiumDiscount}
            billingCycle="monthly"
            credits={SUBSCRIPTION_PLANS.premium.credits}
            features={premiumFeatures}
            themeColor="cyan"
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </section>
  )
}

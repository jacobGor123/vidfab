"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Check, User, Crown, Building, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SUBSCRIPTION_PLANS, getAnnualDiscount } from "@/lib/subscription/pricing-config"
import toast from "react-hot-toast"
import { trackBeginCheckout, trackBillingToggle, trackCancelSubscription } from "@/lib/analytics/gtm"

export default function PricingPage() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('free') // 🔥 用户当前套餐状态
  const [planLoading, setPlanLoading] = useState(true) // 🔥 套餐状态加载中
  const { data: session } = useSession()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  // 🔥 获取用户当前订阅状态
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!session?.user) {
        setPlanLoading(false)
        return
      }

      try {
        setPlanLoading(true)
        const response = await fetch('/api/subscription/status')
        const data = await response.json()

        if (data.success && data.subscription?.plan_id) {
          setCurrentPlan(data.subscription.plan_id.toLowerCase())
        } else {
          setCurrentPlan('free')
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
        setCurrentPlan('free')
      } finally {
        setPlanLoading(false)
      }
    }

    fetchSubscriptionStatus()
  }, [session])

  const handleCancelSubscription = async () => {
    if (!session) return

    setCancelling(true)

    // 🔥 GTM 取消订阅事件跟踪
    trackCancelSubscription(currentPlan);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_period_end: false // 立即取消
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 🔥 区分清理完成和正常取消
        if (data.cleaned) {
          // ✅ 数据已清理，直接刷新页面
          console.log('✅ Orphaned subscription data cleaned up, refreshing page...')
          toast.success('Your account has been updated. Refreshing...', {
            duration: 2000,
          })
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          return
        }

        // ✅ 正常取消：等待 webhook 处理完成后再刷新状态
        toast.success('Subscription cancellation in progress...', {
          duration: 3000,
        })

        // 🔥 轮询检查订阅状态，等待 webhook 更新
        let attempts = 0
        const maxAttempts = 10 // 最多等待 10 秒
        const checkInterval = setInterval(async () => {
          attempts++

          try {
            const statusResponse = await fetch('/api/subscription/status')
            const statusData = await statusResponse.json()

            if (statusData.success && statusData.subscription?.plan_id === 'free') {
              // ✅ 状态已更新为 free
              clearInterval(checkInterval)
              setCurrentPlan('free')
              toast.success('Subscription cancelled successfully. You are now on the Free plan.', {
                duration: 5000,
              })
              setCancelling(false)
            } else if (attempts >= maxAttempts) {
              // ⏱️ 超时，强制刷新页面
              clearInterval(checkInterval)
              toast.success('Subscription cancelled. Refreshing page...', {
                duration: 2000,
              })
              setTimeout(() => {
                window.location.reload()
              }, 2000)
            }
          } catch (error) {
            console.error('Error checking subscription status:', error)
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              setCancelling(false)
            }
          }
        }, 1000) // 每秒检查一次

      } else {
        console.error('Failed to cancel subscription:', data.error)
        toast.error(`Failed to cancel subscription: ${data.error}`)
        setCancelling(false)
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Failed to cancel subscription. Please try again.')
      setCancelling(false)
    }
  }

  const handleSubscribe = async (planId: 'lite' | 'pro' | 'premium') => {
    if (!session) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/signin'
      return
    }

    setSubscribing(planId)

    // 🔥 GTM 开始结账事件跟踪
    const plan = SUBSCRIPTION_PLANS[planId]
    const value = annual ? plan.price.annual / 100 : plan.price.monthly / 100
    trackBeginCheckout(planId, annual ? 'annual' : 'monthly', value)

    try {
      // 使用环境变量控制是否使用测试模式，而不是自动检测开发环境
      const useTestMode = process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'
      const endpoint = useTestMode
        ? '/api/subscription/create-checkout-test'
        : '/api/subscription/create-checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: annual ? 'annual' : 'monthly',
          // 🔥 不传递success_url，让后端自动生成包含所有参数的完整URL
          cancel_url: `${window.location.origin}/pricing`,
        }),
      })

      const data = await response.json()

      console.log('🔧 [PRICING] API响应:', { response: response.status, data });

      if (data.success && data.checkout_url) {
        console.log('✅ [PRICING] 支付API调用成功，跳转到:', data.checkout_url);
        window.location.href = data.checkout_url
      } else {
        console.error('❌ [PRICING] 支付API调用失败:', data.error, data.details);

        // 🔥 处理认证错误
        if (response.status === 401) {
          alert('Please log in again to continue with the subscription. Your session has expired.');
          window.location.href = '/auth/signin';
          return;
        }

        alert(`Failed to start checkout process: ${data.error || 'Unknown error'}. Please try again.`);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <SpaceBackground />
        <Navbar scrolled={scrolled} />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <SkeletonLoader type="title" className="mb-6" />
            <SkeletonLoader type="text" count={2} className="mb-12" />

            <div className="grid md:grid-cols-4 gap-8">
              <SkeletonLoader type="card" className="h-[500px]" />
              <SkeletonLoader type="card" className="h-[500px]" />
              <SkeletonLoader type="card" className="h-[500px]" />
              <SkeletonLoader type="card" className="h-[500px]" />
            </div>
          </div>
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading Pricing Plans..." />
        </div>
      </div>
    )
  }

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2)
  }

  const getAnnualSavings = (planId: 'lite' | 'pro' | 'premium') => {
    const plan = SUBSCRIPTION_PLANS[planId]
    const monthlyTotal = plan.price.monthly * 12
    const savings = monthlyTotal - plan.price.annual
    const percentage = Math.round((savings / monthlyTotal) * 100)
    return { savings: savings / 100, percentage }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />

      <main>
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Choose the plan that's right for you and start creating amazing AI videos.
            </p>

            <div className="flex items-center justify-center mb-12">
              <Label htmlFor="billing-toggle" className={annual ? "text-gray-400" : "text-white"}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={annual}
                onCheckedChange={(checked) => {
                  setAnnual(checked);
                  // 🔥 GTM 计费周期切换事件跟踪
                  trackBillingToggle(checked ? 'annual' : 'monthly');
                }}
                className="mx-4"
              />
              <Label htmlFor="billing-toggle" className={!annual ? "text-gray-400" : "text-white"}>
                Annual <span className="text-xs text-pink-500">(Save up to 33%)</span>
              </Label>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group hover:border-gray-400/50 transition-colors">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400 ml-2">/ forever</span>
                </div>
                <p className="text-gray-400 mt-4 text-sm">Get started with AI video creation — simple and risk-free.</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">50 credits per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Basic AI video generation (480p/720p)</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Video effects library</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Community support</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Videos deleted after 24 hours</span>
                  </li>
                </ul>
                <Button
                  onClick={currentPlan === 'free' ? undefined : handleCancelSubscription}
                  disabled={planLoading || cancelling || currentPlan === 'free'}
                  className={`w-full mt-6 ${
                    currentPlan === 'free'
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {planLoading ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : cancelling ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : currentPlan === 'free' ? (
                    'Current Plan'
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </div>
            </div>

            {/* Lite Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2">Lite</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">
                    ${annual ? formatPrice(SUBSCRIPTION_PLANS.lite.price.annual / 12) : formatPrice(SUBSCRIPTION_PLANS.lite.price.monthly)}
                  </span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && (
                  <div className="mt-1">
                    <p className="text-xs text-blue-500">
                      Billed annually (${formatPrice(SUBSCRIPTION_PLANS.lite.price.annual)})
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Save ${getAnnualSavings('lite').savings} ({getAnnualSavings('lite').percentage}% off)
                    </Badge>
                  </div>
                )}
                <p className="text-gray-400 mt-4 text-sm">Essential toolkit for creators who want quality without limits.</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">300 credits/month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Remove watermarks</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Priority processing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">HD exports (1080p)</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">4 concurrent jobs</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Email support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe('lite')}
                  disabled={subscribing === 'lite' || currentPlan === 'lite' || planLoading}
                  className={`w-full mt-6 ${
                    currentPlan === 'lite'
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {planLoading ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : subscribing === 'lite' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : currentPlan === 'lite' ? (
                    <>
                      Current Plan
                    </>
                  ) : (
                    <>
                      Get Started
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden relative group hover:border-purple-500/70 transition-colors transform scale-105 z-10">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Pro
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">
                    ${annual ? formatPrice(SUBSCRIPTION_PLANS.pro.price.annual / 12) : formatPrice(SUBSCRIPTION_PLANS.pro.price.monthly)}
                  </span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && (
                  <div className="mt-1">
                    <p className="text-xs text-purple-500">
                      Billed annually (${formatPrice(SUBSCRIPTION_PLANS.pro.price.annual)})
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Save ${getAnnualSavings('pro').savings} ({getAnnualSavings('pro').percentage}% off)
                    </Badge>
                  </div>
                )}
                <p className="text-gray-400 mt-4 text-sm">
                  Advanced video production suite for professionals and studios.
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">1000 credits/month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Advanced AI models</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Advanced effects library</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Batch processing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Custom branding</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Priority support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe('pro')}
                  disabled={subscribing === 'pro' || currentPlan === 'pro' || planLoading}
                  className={`w-full mt-6 ${
                    currentPlan === 'pro'
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90'
                  }`}
                >
                  {planLoading ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : subscribing === 'pro' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : currentPlan === 'pro' ? (
                    <>
                      Current Plan
                    </>
                  ) : (
                    <>
                      Get Started
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group hover:border-cyan-400/50 transition-colors">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">
                    ${annual ? formatPrice(SUBSCRIPTION_PLANS.premium.price.annual / 12) : formatPrice(SUBSCRIPTION_PLANS.premium.price.monthly)}
                  </span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && (
                  <div className="mt-1">
                    <p className="text-xs text-cyan-400">
                      Billed annually (${formatPrice(SUBSCRIPTION_PLANS.premium.price.annual)})
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Save ${getAnnualSavings('premium').savings} ({getAnnualSavings('premium').percentage}% off)
                    </Badge>
                  </div>
                )}
                <p className="text-gray-400 mt-4 text-sm">
                  For organizations that need the most powerful video creation capabilities.
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">2000 credits/month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">All AI models included</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Advanced effects library</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Full commercial license</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">1 year storage</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">Dedicated support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe('premium')}
                  disabled={subscribing === 'premium' || currentPlan === 'premium' || planLoading}
                  className={`w-full mt-6 ${
                    currentPlan === 'premium'
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {planLoading ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : subscribing === 'premium' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : currentPlan === 'premium' ? (
                    <>
                      Current Plan
                    </>
                  ) : (
                    <>
                      Get Started
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>

            <div className="mt-8 space-y-6 text-left">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">Can I change plans later?</h3>
                <p className="text-gray-400">
                  Yes, you can upgrade or downgrade your plan at any time. When upgrading, credits are added to your account immediately.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">What happens if I exceed my monthly credits?</h3>
                <p className="text-gray-400">
                  When you use all your credits, you'll be prompted to upgrade to a higher plan. No video generation will be possible until credits are renewed or plan is upgraded.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">How do credits work?</h3>
                <p className="text-gray-400">
                  Different AI models and video settings consume different amounts of credits. For example, generating a 480p 5-second video costs 10 credits, while 1080p 10-second video costs 80 credits.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-400">
                  We accept all major credit cards through Stripe. Annual plans offer significant savings compared to monthly billing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
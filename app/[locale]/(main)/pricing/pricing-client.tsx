"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/pricing-config"
import toast from "react-hot-toast"
import { trackBeginCheckout, trackBillingToggle, trackCancelSubscription, trackViewPricingPage } from "@/lib/analytics/gtm"
import { PlanCard } from "@/components/subscription/plan-card"

export default function PricingPage() {
  const t = useTranslations('pricing')
  const [loading, setLoading] = useState(true)
  const [annual, setAnnual] = useState(false)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('free') // 🔥 用户当前套餐状态
  const [planLoading, setPlanLoading] = useState(true) // 🔥 套餐状态加载中
  const { data: session } = useSession()

  // 🔥 GTM 访问价格页事件跟踪
  useEffect(() => {
    trackViewPricingPage()
  }, [])

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => {
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

  const handleSubscribe = async (planId: 'pro' | 'premium') => {
    if (!session) {
      // Redirect to login if not authenticated
      window.location.href = '/login'
      return
    }

    setSubscribing(planId)

    // 🔥 GTM 开始结账事件跟踪
    const plan = SUBSCRIPTION_PLANS[planId]
    const value = annual ? plan.price.annual / 100 : plan.price.monthly / 100
    trackBeginCheckout(planId, annual ? 'annual' : 'monthly', value, 'pricing_page')

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
          window.location.href = '/login';
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
        <div className="mx-auto w-full px-5 sm:px-10 md:px-14 lg:px-8 pt-32 pb-20" style={{ maxWidth: 1280 }}>
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
          <LoadingState message={t('loading')} />
        </div>
      </div>
    )
  }

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2)
  }

  const freeFeatures = t.raw('free.features') as string[]
  const proFeatures = t.raw('pro.features') as string[]
  const premiumFeatures = t.raw('premium.features') as string[]
  const faqItems = t.raw('faq.items') as Array<{
    question: string
    answer: string | null
    intro: string | null
    bullets: string[] | null
    outro: string | null
  }>

  const btnLabel = (planKey: string, isSubscribing: boolean, isCancelling?: boolean) => {
    if (planLoading) return <><Zap className="h-4 w-4 mr-2 animate-spin" />{t('loadingBtn')}</>
    if (isCancelling) return <><Zap className="h-4 w-4 mr-2 animate-spin" />{t('cancelling')}</>
    if (isSubscribing) return <><Zap className="h-4 w-4 mr-2 animate-spin" />{t('processing')}</>
    if (currentPlan === planKey) return t('currentPlan')
    return t('getStarted')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />

      <main>
        <div className="mx-auto w-full px-5 sm:px-10 md:px-14 lg:px-8 pt-24 md:pt-32 pb-16 md:pb-20" style={{ maxWidth: 1280 }}>
          <div className="max-w-5xl mx-auto text-center mb-10 md:mb-16">
            <h1
              className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)' }}
            >
              {t('title')}
            </h1>
            <p className="text-lg text-white mb-8">
              {t('subtitle')}
            </p>

            {/* Monthly / Annual toggle — Figma pill style */}
            <div className="flex items-center justify-center mb-8 md:mb-12">
              <div
                className="flex items-center rounded-full"
                style={{ border: '1px solid #555555', padding: '4px 5px', gap: '4px' }}
              >
                <button
                  onClick={() => { setAnnual(false); trackBillingToggle('monthly') }}
                  className="px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={!annual
                    ? { background: '#555555', color: '#ffffff' }
                    : { color: 'rgba(255,255,255,0.5)' }}
                >
                  {t('monthly')}
                </button>
                <button
                  onClick={() => { setAnnual(true); trackBillingToggle('annual') }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={annual
                    ? { background: '#555555', color: '#ffffff' }
                    : { color: 'rgba(255,255,255,0.5)' }}
                >
                  {t('annual')}
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#470085', color: '#CD94FF' }}
                  >
                    {t('saveUpTo20')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-w-5xl mx-auto items-stretch">

            {/* Free Plan */}
            <div className="relative p-[1px] rounded-[20px]" style={{ background: 'linear-gradient(to bottom, #af60ec, #592055)' }}>
              <div className="rounded-[20px] overflow-hidden flex flex-col h-full" style={{ background: '#1a1539' }}>
                <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 md:pb-5">
                  <h3 className="text-xl font-bold text-white mb-3">{t('free.name')}</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-[#dddddd] text-sm">{t('foreverFree')}</span>
                  </div>
                  <p className="text-[#dddddd] text-sm leading-relaxed">{t('free.description')}</p>
                </div>
                <div className="h-px bg-[#2f2b49] mx-5 md:mx-6" />
                <div className="px-5 md:px-6 py-4 md:py-5 flex-1">
                  <ul className="space-y-3">
                    {freeFeatures.map(f => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#30ff8e' }} />
                        <span className="text-sm text-white">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 md:px-6 pb-5 md:pb-6">
                  <Button
                    onClick={currentPlan === 'free' ? undefined : handleCancelSubscription}
                    disabled={planLoading || cancelling || currentPlan === 'free'}
                    className="w-full h-11 rounded-lg text-sm font-medium !text-white/60 cursor-not-allowed"
                    style={{ background: '#2b2555' }}
                  >
                    {btnLabel('free', false, cancelling)}
                  </Button>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <PlanCard
              borderGradient="linear-gradient(to bottom, #4e66ff, #53b7e8)"
              bgGradient="linear-gradient(180deg, #3f298c 0%, #140b48 100%)"
              badge={t('mostPopular')}
              headerImage="/images/pricing-pro-header.png"
              headerMinHeight={172}
              featureSpacing="space-y-3"
              featureGap="gap-2.5"
              header={
                <>
                  <h3 className="text-xl font-bold text-white mb-3">{t('pro.name')}</h3>
                  {annual ? (
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold" style={{ color: '#4cc3ff' }}>${formatPrice(SUBSCRIPTION_PLANS.pro.price.annual / 12)}</span>
                      <span className="text-sm text-white/80">{t('perMonth')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-bold" style={{ color: '#4cc3ff' }}>$9.90</span>
                        <span className="text-sm text-white/80">{t('firstMonth')}</span>
                      </div>
                      <p className="text-sm font-semibold text-white mb-3">
                        {t('thenPerMonth', { price: formatPrice(SUBSCRIPTION_PLANS.pro.price.monthly) })}
                      </p>
                    </>
                  )}
                  {annual && (
                    <p className="text-sm text-[#dddddd] mb-3">
                      {t('billedAnnually', { price: formatPrice(SUBSCRIPTION_PLANS.pro.price.annual) })}
                    </p>
                  )}
                  <p className="text-sm text-[#dddddd]">{t('pro.description')}</p>
                </>
              }
              features={proFeatures}
              dividerColor="#422d90"
              button={
                <Button
                  onClick={() => handleSubscribe('pro')}
                  disabled={subscribing === 'pro' || currentPlan === 'pro' || planLoading}
                  className={`w-full h-11 rounded-lg text-sm font-medium !text-white ${currentPlan === 'pro' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : 'hover:opacity-90'}`}
                  style={currentPlan !== 'pro' ? { background: 'linear-gradient(90deg, #e037ff 0%, #3e6aff 100%)' } : undefined}
                >
                  {btnLabel('pro', subscribing === 'pro')}
                </Button>
              }
            />

            {/* Premium Plan */}
            <PlanCard
              borderGradient="linear-gradient(to bottom, #ff64f4, #6560ec)"
              bgGradient="linear-gradient(180deg, #430e84 0%, #2e0b48 100%)"
              headerImage="/images/pricing-premium-header.png"
              headerMinHeight={151}
              featureSpacing="space-y-3"
              featureGap="gap-2.5"
              header={
                <>
                  <h3 className="text-xl font-bold text-white mb-3">{t('premium.name')}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-white">
                      ${annual ? formatPrice(SUBSCRIPTION_PLANS.premium.price.annual / 12) : formatPrice(SUBSCRIPTION_PLANS.premium.price.monthly)}
                    </span>
                    <span className="text-sm text-white/80">{t('perMonth')}</span>
                  </div>
                  {annual && (
                    <p className="text-sm text-[#dddddd] mb-3">
                      {t('billedAnnually', { price: formatPrice(SUBSCRIPTION_PLANS.premium.price.annual) })}
                    </p>
                  )}
                  <p className="text-sm text-[#dddddd]">{t('premium.description')}</p>
                </>
              }
              features={premiumFeatures}
              dividerColor="#4b2d90"
              button={
                <Button
                  onClick={() => handleSubscribe('premium')}
                  disabled={subscribing === 'premium' || currentPlan === 'premium' || planLoading}
                  className={`w-full h-11 rounded-lg text-sm font-medium !text-white ${currentPlan === 'premium' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : 'hover:opacity-90'}`}
                  style={currentPlan !== 'premium' ? { background: '#814cff' } : undefined}
                >
                  {btnLabel('premium', subscribing === 'premium')}
                </Button>
              }
            />
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-12 md:mt-20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              {t('faq.title')}
            </h2>

            <div className="mt-6 md:mt-8 space-y-4 md:space-y-6 text-left">
              {faqItems.map((item, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-2">{item.question}</h3>
                  {item.answer && (
                    <p className="text-gray-400 text-sm md:text-base">{item.answer}</p>
                  )}
                  {item.intro && (
                    <p className="text-gray-400 text-sm md:text-base mb-3 md:mb-4">{item.intro}</p>
                  )}
                  {item.bullets && (
                    <ul className="list-disc list-inside text-gray-400 text-sm md:text-base space-y-2 mb-3">
                      {item.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  )}
                  {item.outro && (
                    <p className="text-gray-400 text-sm md:text-base">{item.outro}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

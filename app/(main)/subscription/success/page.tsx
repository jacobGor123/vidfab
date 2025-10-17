"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { Check, Zap, Crown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { trackPurchase } from "@/lib/analytics/gtm"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/pricing-config"

function SubscriptionSuccessPageInner() {
  const [scrolled, setScrolled] = useState(false)
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!session) return

      try {
        const response = await fetch('/api/subscription/status')
        const data = await response.json()

        if (data.success) {
          setSubscriptionDetails(data)

          // 🔥 GTM 购买转化事件跟踪
          const planId = data.subscription?.plan_id
          const billingCycle = data.subscription?.billing_cycle || 'monthly'

          if (planId && ['lite', 'pro', 'premium'].includes(planId)) {
            const plan = SUBSCRIPTION_PLANS[planId as 'lite' | 'pro' | 'premium']
            const value = billingCycle === 'annual'
              ? plan.price.annual / 100
              : plan.price.monthly / 100

            // 触发 GA4 purchase 事件
            trackPurchase(
              planId,
              billingCycle as 'monthly' | 'annual',
              value,
              sessionId || `sub_${Date.now()}`
            )
          }
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error)
      } finally {
        setLoading(false)
      }
    }

    // 延迟获取状态，确保webhook已处理
    const timer = setTimeout(fetchSubscriptionStatus, 3000)

    return () => clearTimeout(timer)
  }, [session, sessionId])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />

      <main className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Success Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Welcome to VidFab {subscriptionDetails?.subscription?.plan_id ?
                subscriptionDetails.subscription.plan_id.charAt(0).toUpperCase() + subscriptionDetails.subscription.plan_id.slice(1)
                : 'Pro'}!
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Your subscription has been activated successfully. You now have access to powerful AI video creation tools.
            </p>
          </div>

          {/* Subscription Details */}
          {loading ? (
            <Card className="bg-white/5 border-white/10 p-8 mb-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-600 rounded mb-4"></div>
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
              </div>
            </Card>
          ) : subscriptionDetails ? (
            <Card className="bg-white/5 border-white/10 p-8 mb-8">
              <div className="flex items-center justify-center mb-6">
                <Crown className="w-8 h-8 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold capitalize">
                  {subscriptionDetails.subscription?.plan_id} Plan
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div>
                  <h3 className="font-semibold text-green-400 mb-2">What's included:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <Zap className="w-4 h-4 text-blue-400 mr-2" />
                      <span>{subscriptionDetails.credits_remaining} credits available</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-400 mr-2" />
                      <span>HD video exports (1080p)</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-400 mr-2" />
                      <span>Advanced AI models</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-400 mr-2" />
                      <span>Priority processing</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-400 mr-2" />
                      <span>No watermarks</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">Plan Details:</h3>
                  <div className="space-y-2">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Status:</span> {subscriptionDetails.subscription?.status}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Billing:</span> {subscriptionDetails.subscription?.billing_cycle}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Credits:</span> {subscriptionDetails.credits_remaining} remaining
                    </p>
                    {sessionId && (
                      <p className="text-gray-300 text-sm">
                        <span className="text-gray-400">Session:</span> {sessionId.slice(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10 p-8 mb-8">
              <p className="text-gray-400">Loading subscription details...</p>
            </Card>
          )}

          {/* Next Steps */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="bg-white/5 border-white/10 p-6 text-left">
              <h3 className="font-bold text-lg mb-3 text-blue-400">Start Creating</h3>
              <p className="text-gray-300 mb-4">
                Jump into the video creation studio and start making amazing AI-powered videos with your new credits.
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/create?tool=my-profile">
                  View My Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6 text-left">
              <h3 className="font-bold text-lg mb-3 text-purple-400">Manage Account</h3>
              <p className="text-gray-300 mb-4">
                View your subscription details, billing history, and manage your account settings.
              </p>
              <Button asChild variant="outline" className="w-full border-white/20 hover:bg-white/10">
                <Link href="/account">
                  Account Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>
          </div>

          {/* Credits Usage Guide */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 p-8">
            <h3 className="font-bold text-xl mb-4 text-purple-300">Credits Usage Guide</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-400 mb-1">Basic Video (480p, 5s)</div>
                <div className="text-gray-300">10 credits</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-400 mb-1">HD Video (1080p, 10s)</div>
                <div className="text-gray-300">80 credits</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-400 mb-1">Premium AI (veo3-fast)</div>
                <div className="text-gray-300">100 credits</div>
              </div>
            </div>
            <p className="text-gray-400 mt-4 text-sm">
              Your credits renew monthly. Unused credits from previous month may carry over up to plan limits.
            </p>
          </Card>

          {/* Support */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">
              Need help getting started? Our support team is here to help.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild variant="outline" size="sm" className="border-white/20">
                <Link href="/docs">
                  Documentation
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/20">
                <Link href="/support">
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <SpaceBackground />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <SubscriptionSuccessPageInner />
    </Suspense>
  )
}
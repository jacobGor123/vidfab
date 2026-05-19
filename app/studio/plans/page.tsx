"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { CSSProperties } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useSubscription } from "@/hooks/use-subscription"
import { Crown } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/pricing-config"
import type { SubscriptionOrder } from "@/lib/subscription/types"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"
import { CancelSubscriptionDialog } from "@/components/ui/cancel-subscription-dialog"
import { trackPurchase } from "@/lib/analytics/gtm"
import toast from "react-hot-toast"
import { format } from "date-fns"

export const dynamic = 'force-dynamic'

function PlanSkeletonLine({ className, style }: { className: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-white/15 ${className}`}
      style={style}
    />
  )
}

export default function PlansPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { subscription, creditsRemaining, isLoading, refreshSubscription } = useSubscription()
  const [orders, setOrders] = useState<SubscriptionOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const purchaseTrackedRef = useRef(false)

  // 检测 Stripe 支付成功回调，触发购买转化事件
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success')
    const sessionId = searchParams.get('session_id')
    const planId = searchParams.get('plan')
    const billingCycle = (searchParams.get('billing_cycle') || 'monthly') as 'monthly' | 'annual'

    if (!paymentSuccess || !planId || purchaseTrackedRef.current) return
    if (!['pro', 'premium'].includes(planId)) return

    purchaseTrackedRef.current = true

    const plan = SUBSCRIPTION_PLANS[planId as 'pro' | 'premium']
    const value = billingCycle === 'annual' ? plan.price.annual / 100 : plan.price.monthly / 100

    trackPurchase(planId, billingCycle, value, sessionId || `sub_${Date.now()}`)
    toast.success('🎉 Subscription activated successfully!')
  }, [searchParams])

  const fetchOrders = useCallback(async () => {
    if (!session?.user) return
    try {
      setOrdersLoading(true)
      const res = await fetch('/api/subscription/orders?limit=20&status=completed')
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } finally {
      setOrdersLoading(false)
    }
  }, [session?.user])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleCancel = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_period_end: true }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCancelDialog(false)
        toast.success('Auto-renew disabled. Access continues until period end.')
        await refreshSubscription()
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } finally {
      setCancelling(false)
    }
  }

  const currentPlanConfig = subscription ? SUBSCRIPTION_PLANS[subscription.plan_id] : SUBSCRIPTION_PLANS.free
  const nextBillingDate = subscription?.period_end
    ? format(new Date(subscription.period_end), 'MMM dd, yyyy')
    : '—'

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatDate = (iso: string) => format(new Date(iso), 'MMM dd, yyyy')

  const planId = subscription?.plan_id || 'free'
  const isCancellationScheduled = planId !== 'free' && subscription?.status === 'cancelled' && subscription.auto_renew === false
  const hasPaidCredits = planId !== 'free' && (subscription?.status === 'active' || subscription?.status === 'cancelled')
  const monthlyTotal = subscription?.credits_monthly_total ?? 0
  const monthlyAvailable = subscription?.credits_monthly_balance ?? 0
  const monthlyUsed = Math.max(0, monthlyTotal - monthlyAvailable)
  const otherCredits = subscription?.credits_other_balance ?? Math.max(0, creditsRemaining - monthlyAvailable)
  const lastResetDate = hasPaidCredits && subscription?.credits_last_reset_date
    ? formatDate(subscription.credits_last_reset_date)
    : '/'
  const nextResetDate = hasPaidCredits && !isCancellationScheduled && subscription?.credits_next_reset_at
    ? formatDate(subscription.credits_next_reset_at)
    : '/'
  const successfulOrders = orders.filter(order => order.status === 'completed')
  const cardBgImage = planId === 'premium'
    ? '/images/plans-card-bg-premium.png'
    : planId === 'pro'
      ? '/images/plans-card-bg-pro.png'
      : '/images/plans-card-bg-free.png'
  const showGem = planId !== 'free'

  return (
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8" style={{ background: '#0b081e' }}>
      {/* Decorative radial glow — desktop only */}
      <div
        className="hidden md:block fixed top-16 left-48 w-[700px] h-[700px] rounded-full pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(47,29,84,0.5) 0%, transparent 65%)' }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* ── Subscription Plan section ── */}
        <div className="flex items-center gap-2.5 mb-5">
          <Image src="/icons/plans/subscription-plan-icon.png" width={20} height={20} alt="" />
          <h2 className="text-lg md:text-xl font-medium" style={{ color: '#c3c2cc' }}>Subscription Plan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-8 md:mb-10">
          {/* Current Plan Card */}
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              backgroundImage: `url(${cardBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: 236,
            }}
          >

            <div className="relative px-6 py-6">
              <p className="text-sm mb-2" style={{ color: '#c7bfe4' }}>Current Plan</p>
              {isLoading ? (
                <div aria-hidden="true">
                  <div className="flex items-center gap-2.5 mb-4 h-8">
                    <PlanSkeletonLine className="h-8 w-40" />
                    <PlanSkeletonLine className="h-6 w-24 rounded-full" />
                  </div>

                  <div className="space-y-3 mb-6">
                    <PlanSkeletonLine className="h-5 w-64 max-w-full" />
                    <PlanSkeletonLine className="h-5 w-52 max-w-full" />
                  </div>

                  <PlanSkeletonLine className="h-10 w-44 rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-4">
                    <h3 className="text-2xl font-bold text-white">{currentPlanConfig?.name || 'Free'} Plan</h3>
                    {subscription?.plan_id !== 'free' && (
                      <Crown className="h-5 w-5 flex-shrink-0" style={{ color: '#ffc863' }} />
                    )}
                    {planId === 'free' ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(255,127,48,0.15)', color: '#ff7f30' }}
                      >
                        Expired
                      </span>
                    ) : subscription?.status === 'active' ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(26,176,94,0.25)', color: '#30ff8d' }}
                      >
                        Active
                      </span>
                    ) : isCancellationScheduled ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(255,200,99,0.18)', color: '#ffc863' }}
                      >
                        Cancels soon
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <span style={{ color: '#c7bfe4' }}>
                        {isCancellationScheduled ? 'Access until :' : 'Next billing :'}
                      </span>
                      <span style={{ color: '#c7bfe4' }}>
                        {planId === 'free' ? 'No active subscription' : nextBillingDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span style={{ color: '#c7bfe4' }}>Auto-renew :</span>
                      <span style={{ color: subscription?.auto_renew ? '#30ff8d' : '#c7bfe4' }}>
                        {planId === 'free' ? 'Closure' : subscription?.auto_renew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <Button
                      onClick={() => setShowUpgrade(true)}
                      className="h-10 px-5 text-sm font-medium !text-white rounded-lg hover:opacity-90"
                      style={{ background: 'linear-gradient(90deg, #5b7fff 0%, #7b4fff 100%)' }}
                    >
                      <Image src="/icons/plans/upgrade-plan-icon.png" width={16} height={16} alt="" className="mr-1.5" />
                      Upgrade Plan
                    </Button>
                    {subscription?.plan_id !== 'free' && subscription?.status === 'active' && subscription.auto_renew && (
                      <Button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={cancelling}
                        variant="ghost"
                        className="h-10 px-5 text-sm font-medium rounded-lg !border !border-white/10"
                        style={{ background: '#1c1042', color: '#c7bfe4' }}
                      >
                        {cancelling ? 'Cancelling...' : (
                          <><Image src="/icons/plans/cancel-icon.png" width={16} height={16} alt="" className="mr-1.5 inline-block" />Cancel Subscription</>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Credits Balance Card */}
          <div className="rounded-2xl p-6" style={{ background: '#1a1539', minHeight: 236 }}>
            <p className="text-sm font-medium" style={{ color: '#eaeaea' }}>Credits Balance</p>
            {isLoading ? (
              <div aria-hidden="true">
                <div className="flex items-baseline gap-2 mt-2 mb-5 h-10">
                  <PlanSkeletonLine className="h-10 w-32" />
                  <PlanSkeletonLine className="h-5 w-36" />
                </div>

                <div className="space-y-3 text-sm">
                  {[220, 190, 170, 160, 210].map((width, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 h-5">
                      <PlanSkeletonLine className="h-5 max-w-[65%]" style={{ width }} />
                      <PlanSkeletonLine className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mt-2 mb-5">
                  <span className="text-3xl font-bold text-white">{creditsRemaining.toLocaleString()}</span>
                  <span className="text-sm" style={{ color: '#c7bfe4' }}>Credits Available</span>
                </div>

                <div className="space-y-2.5 text-sm">
                  {hasPaidCredits ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span style={{ color: '#c7bfe4' }}>Monthly Credits Available:</span>
                        <span className="font-medium text-white">{monthlyAvailable.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span style={{ color: '#c7bfe4' }}>Monthly Credits Used:</span>
                        <span className="font-medium text-white">{monthlyUsed.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span style={{ color: '#c7bfe4' }}>Last Reset on:</span>
                        <span style={{ color: '#c7bfe4' }}>{lastResetDate}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span style={{ color: '#c7bfe4' }}>Next Reset on:</span>
                        <span style={{ color: '#c7bfe4' }}>{nextResetDate}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span style={{ color: '#c7bfe4' }}>Other Credits Available:</span>
                        <span className="font-medium text-white">{otherCredits.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <span style={{ color: '#c7bfe4' }}>Other Credits Available:</span>
                      <span className="font-medium text-white">{creditsRemaining.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Order History section ── */}
        <div className="flex items-center gap-2.5 mb-5">
          <Image src="/icons/plans/order-history-icon.png" width={20} height={20} alt="" />
          <h2 className="text-lg md:text-xl font-medium" style={{ color: '#c3c1cb' }}>Order History</h2>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: '#0b081f', border: '1px solid #625f75' }}>
          {ordersLoading ? (
            <div className="py-14 text-center text-sm" style={{ color: '#c7bfe4' }}>Loading orders...</div>
          ) : successfulOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Image src="/images/plans-empty-orders.png" width={200} height={160} alt="" className="mb-4" />
              <p className="text-sm" style={{ color: '#c7bfe4' }}>You don&apos;t have a bill yet.</p>
            </div>
          ) : (
            successfulOrders.map((order, i) => (
              <div key={order.id}>
                {i > 0 && <div className="h-px mx-6" style={{ background: '#625f75' }} />}
                <div className="px-4 py-4 md:px-6 md:py-5">
                  {/* Row 1: plan name (left) / price (right) */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-base md:text-xl font-semibold text-white">
                        {SUBSCRIPTION_PLANS[order.plan_id]?.name ?? order.plan_id} Plan
                      </span>
                    </div>
                    <span className="text-base md:text-xl font-semibold text-white flex-shrink-0">{formatPrice(order.amount_cents)}</span>
                  </div>
                  {/* Row 2: billing type + credits / date — stack on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <span className="text-sm md:text-base" style={{ color: '#c7bfe4' }}>
                        {order.billing_cycle === 'monthly' ? 'Monthly Subscription' : 'Annual Subscription'}
                      </span>
                      {order.credits_included > 0 && (
                        <span className="text-sm md:text-base" style={{ color: '#4cc3ff' }}>
                          {order.credits_included.toLocaleString()} credits included
                        </span>
                      )}
                    </div>
                    <span className="text-sm md:text-base" style={{ color: '#c7bfe4' }}>
                      {order.created_at ? formatDate(order.created_at) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        recommendedPlan={subscription?.plan_id === 'pro' ? 'premium' : 'pro'}
      />
      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancel}
        isLoading={cancelling}
        currentPlan={currentPlanConfig?.name || 'subscription'}
        creditsRemaining={creditsRemaining}
        cancelAtPeriodEnd
      />
    </div>
  )
}

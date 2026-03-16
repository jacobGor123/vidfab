"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSubscription } from "@/hooks/use-subscription"
import { Crown } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/pricing-config"
import type { SubscriptionOrder } from "@/lib/subscription/types"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"
import toast from "react-hot-toast"
import { format } from "date-fns"

export const dynamic = 'force-dynamic'

export default function PlansPage() {
  const { data: session } = useSession()
  const { subscription, creditsRemaining, isLoading, refreshSubscription } = useSubscription()
  const [orders, setOrders] = useState<SubscriptionOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!session?.user) return
    try {
      setOrdersLoading(true)
      const res = await fetch('/api/subscription/orders?limit=20')
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } finally {
      setOrdersLoading(false)
    }
  }, [session?.user])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_period_end: true }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Subscription cancelled. Access continues until period end.')
        await refreshSubscription()
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } finally {
      setCancelling(false)
    }
  }

  const currentPlanConfig = subscription ? SUBSCRIPTION_PLANS[subscription.plan_id] : SUBSCRIPTION_PLANS.free
  const planCredits = currentPlanConfig?.credits ?? 200
  const creditsPercent = planCredits > 0 ? Math.min((creditsRemaining / planCredits) * 100, 100) : 0
  const creditsPercentDisplay = planCredits > 0 ? ((creditsRemaining / planCredits) * 100).toFixed(1) : '0'
  const nextBillingDate = subscription?.period_end
    ? format(new Date(subscription.period_end), 'MMM dd, yyyy')
    : '—'

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatDate = (iso: string) => format(new Date(iso), 'MMM dd, yyyy')

  const planId = subscription?.plan_id || 'free'
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
                ) : null}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <span style={{ color: '#c7bfe4' }}>Next billing :</span>
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
                {subscription?.plan_id !== 'free' && subscription?.status === 'active' && (
                  <Button
                    onClick={handleCancel}
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
            </div>
          </div>

          {/* Credits Balance Card */}
          <div className="rounded-2xl p-6" style={{ background: '#1a1539', minHeight: 236 }}>
            <p className="text-sm font-medium" style={{ color: '#eaeaea' }}>Credits Balance</p>
            <div className="flex items-baseline gap-2 mt-2 mb-3">
              <span className="text-3xl font-bold text-white">{creditsRemaining.toLocaleString()}</span>
              <span className="text-sm" style={{ color: '#c7bfe4' }}>Credits Available</span>
            </div>

            <div className="w-full h-2 rounded-full mb-1" style={{ background: '#3c3966' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${creditsPercent}%`, background: '#5c64ff' }}
              />
            </div>
            <div className="flex justify-between text-xs mb-5" style={{ color: '#c7bfe4' }}>
              <span>{creditsPercentDisplay}% remaining</span>
              <span>{planCredits.toLocaleString()} credits/month</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#c7bfe4' }}>Resets on :</span>
              <span style={{ color: '#c7bfe4' }}>{nextBillingDate}</span>
            </div>
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
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Image src="/images/plans-empty-orders.png" width={200} height={160} alt="" className="mb-4" />
              <p className="text-sm" style={{ color: '#c7bfe4' }}>You don&apos;t have a bill yet.</p>
            </div>
          ) : (
            orders.map((order, i) => (
              <div key={order.id}>
                {i > 0 && <div className="h-px mx-6" style={{ background: '#625f75' }} />}
                <div className="px-4 py-4 md:px-6 md:py-5">
                  {/* Row 1: plan name + badge (left) / price (right) */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-base md:text-xl font-semibold text-white">
                        {SUBSCRIPTION_PLANS[order.plan_id]?.name ?? order.plan_id} Plan
                      </span>
                      {order.status === 'completed' ? (
                        <span
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-xs"
                          style={{
                            background: 'rgba(26,176,94,0.26)',
                            border: '1px solid #30ff8e',
                            color: '#2fff8d',
                          }}
                        >
                          Active
                        </span>
                      ) : order.status === 'cancelled' ? (
                        <span
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-xs"
                          style={{
                            background: 'rgba(255,255,255,0.10)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: 'rgba(255,255,255,0.45)',
                          }}
                        >
                          Cancelled
                        </span>
                      ) : null}
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
    </div>
  )
}

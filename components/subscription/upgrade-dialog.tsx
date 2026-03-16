"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/pricing-config"
import type { PlanId } from "@/lib/subscription/types"
import { trackBeginCheckout } from "@/lib/analytics/gtm"
import { PlanCard } from "./plan-card"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recommendedPlan?: PlanId
  context?: string
}

const PRO_FEATURES = [
  '1500 credits reset monthly',
  'About 500 images or 150 videos (480p)',
  '20 free script creations & analyses/month',
  'Watermark-free exports',
  'Advanced AI models',
  'Access to HD resolution (up to 1080P)',
  '4 concurrent generation',
  'Priority support',
  'Cancel anytime',
]

const PREMIUM_FEATURES = [
  '3500 credits reset monthly',
  'About 1166 images or 350 videos (480p)',
  '50 free script creations & analyses/month',
  'Watermark-free exports',
  'Advanced AI models',
  'Access to HD resolution (up to 1080P)',
  '4 concurrent generation',
  'Dedicated support',
  'Cancel anytime',
]

export function UpgradeDialog({
  open,
  onOpenChange,
  recommendedPlan = 'pro',
  context
}: UpgradeDialogProps) {
  const { data: session } = useSession()
  const { subscription, upgradeSubscription } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const currentPlan = subscription?.plan_id || 'free'

  const handleUpgrade = async (planId: PlanId) => {
    if (!session?.user?.uuid || isUpgrading) return
    setIsUpgrading(true)
    try {
      const plan = SUBSCRIPTION_PLANS[planId]
      const value = billingCycle === 'annual' ? plan.price.annual / 100 : plan.price.monthly / 100
      trackBeginCheckout(planId, billingCycle, value, 'upgrade_dialog')
      await upgradeSubscription(planId, billingCycle)
    } catch (error: any) {
      console.error('Upgrade failed:', error)
    } finally {
      setIsUpgrading(false)
    }
  }

  const formatPrice = (priceInCents: number) => (priceInCents / 100).toFixed(2)

  const proPriceDisplay = billingCycle === 'annual'
    ? `$${formatPrice(SUBSCRIPTION_PLANS.pro.price.annual / 12)}`
    : `$${formatPrice(SUBSCRIPTION_PLANS.pro.price.monthly)}`

  const premiumPriceDisplay = billingCycle === 'annual'
    ? `$${formatPrice(SUBSCRIPTION_PLANS.premium.price.annual / 12)}`
    : `$${formatPrice(SUBSCRIPTION_PLANS.premium.price.monthly)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border-white/10 !p-4 sm:!p-6"
        style={{ background: '#0c0a1a' }}
      >
        {/* Header */}
        <div className="text-center pt-2 pb-4">
          <DialogTitle
            className="text-2xl font-bold bg-clip-text text-transparent mb-2"
            style={{ backgroundImage: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)' }}
          >
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {context || "Unlock powerful AI models and get more credits for video generation"}
          </DialogDescription>
        </div>

        {/* Monthly / Annual toggle */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center rounded-full"
            style={{ border: '1px solid #555555', padding: '4px 5px', gap: '4px' }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className="px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={billingCycle === 'monthly'
                ? { background: '#555555', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={billingCycle === 'annual'
                ? { background: '#555555', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Annual
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#470085', color: '#CD94FF' }}
              >
                Save up to 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch">
          <PlanCard
            borderGradient="linear-gradient(to bottom, #4e66ff, #53b7e8)"
            bgGradient="linear-gradient(180deg, #3f298c 0%, #140b48 100%)"
            badge={recommendedPlan === 'pro' ? 'MOST POPULAR' : undefined}
            headerImage="/images/pricing-pro-header.png"
            headerMinHeight={130}
            header={
              <>
                <h3 className="text-lg font-bold text-white mb-2">Pro Plan</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold" style={{ color: '#4cc3ff' }}>
                    {proPriceDisplay}
                  </span>
                  <span className="text-sm text-white/80">/ month</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-[#dddddd]">
                    Billed annually (${formatPrice(SUBSCRIPTION_PLANS.pro.price.annual)})
                  </p>
                )}
              </>
            }
            features={PRO_FEATURES}
            dividerColor="#422d90"
            button={
              <Button
                onClick={() => handleUpgrade('pro')}
                disabled={currentPlan === 'pro' || isUpgrading}
                className={`w-full h-11 rounded-lg text-sm font-medium !text-white ${currentPlan === 'pro' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : 'hover:opacity-90'}`}
                style={currentPlan !== 'pro' ? { background: 'linear-gradient(90deg, #e037ff 0%, #3e6aff 100%)' } : undefined}
              >
                {isUpgrading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  : currentPlan === 'pro' ? 'Current Plan' : 'Get Started'
                }
              </Button>
            }
            buttonPaddingTop
          />

          <PlanCard
            borderGradient="linear-gradient(to bottom, #ff64f4, #6560ec)"
            bgGradient="linear-gradient(180deg, #430e84 0%, #2e0b48 100%)"
            badge={recommendedPlan === 'premium' ? 'RECOMMENDED' : undefined}
            headerImage="/images/pricing-premium-header.png"
            headerMinHeight={130}
            header={
              <>
                <h3 className="text-lg font-bold text-white mb-2">Premium</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-white">{premiumPriceDisplay}</span>
                  <span className="text-sm text-white/80">/ month</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-[#dddddd]">
                    Billed annually (${formatPrice(SUBSCRIPTION_PLANS.premium.price.annual)})
                  </p>
                )}
              </>
            }
            features={PREMIUM_FEATURES}
            dividerColor="#4b2d90"
            button={
              <Button
                onClick={() => handleUpgrade('premium')}
                disabled={currentPlan === 'premium' || isUpgrading}
                className={`w-full h-11 rounded-lg text-sm font-medium !text-white ${currentPlan === 'premium' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : 'hover:opacity-90'}`}
                style={currentPlan !== 'premium' ? { background: '#814cff' } : undefined}
              >
                {isUpgrading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  : currentPlan === 'premium' ? 'Current Plan' : 'Get Started'
                }
              </Button>
            }
            buttonPaddingTop
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 pt-2">
          Secure payment via Stripe · Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  )
}

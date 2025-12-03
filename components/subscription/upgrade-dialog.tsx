"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Crown,
  Zap,
  Check,
  ArrowRight,
  Loader2,
  Sparkles,
  Shield,
  Clock
} from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import { SUBSCRIPTION_PLANS, MODEL_ACCESS } from "@/lib/subscription/pricing-config"
import type { PlanId } from "@/lib/subscription/types"
import { trackBeginCheckout } from "@/lib/analytics/gtm"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recommendedPlan?: PlanId
  context?: string // 上下文信息，比如"需要更多Credits生成视频"
}

export function UpgradeDialog({
  open,
  onOpenChange,
  recommendedPlan = 'pro',
  context
}: UpgradeDialogProps) {
  const { data: session } = useSession()
  const { subscription, upgradeSubscription } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(recommendedPlan)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const currentPlan = subscription?.plan_id || 'free'

  // 处理升级
  const handleUpgrade = async (planId: PlanId) => {
    if (!session?.user?.uuid || isUpgrading) return

    setIsUpgrading(true)
    try {
      // 🔥 GTM 开始结账事件跟踪
      const plan = SUBSCRIPTION_PLANS[planId]
      const value = billingCycle === 'annual' ? plan.price.annual / 100 : plan.price.monthly / 100
      trackBeginCheckout(planId, billingCycle, value, 'upgrade_dialog')

      await upgradeSubscription(planId, billingCycle)
      // 升级成功后会跳转到Stripe结账页面
    } catch (error: any) {
      console.error('升级失败:', error)
      // 这里可以添加错误提示
    } finally {
      setIsUpgrading(false)
    }
  }

  // 价格格式化
  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2)
  }

  // 计算年度折扣
  const getAnnualSavings = (monthlyPrice: number, annualPrice: number) => {
    const monthlyCost = monthlyPrice * 12
    return monthlyCost - annualPrice
  }

  // 过滤掉免费计划，只显示付费计划
  const paidPlans = Object.entries(SUBSCRIPTION_PLANS).filter(([id]) => id !== 'free')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {context || "Unlock powerful AI models and get more credits for video generation"}
          </DialogDescription>
        </DialogHeader>


        {/* 计费周期选择 */}
        <div className="flex justify-center">
          <div className="flex bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual
              <Badge className="ml-2 bg-green-600 hover:bg-green-600 text-xs">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        {/* 订阅计划网格 */}
        <div className="grid md:grid-cols-3 gap-4">
          {paidPlans.map(([planId, plan]) => {
            const isRecommended = planId === recommendedPlan
            const isCurrentPlan = planId === currentPlan
            const price = billingCycle === 'annual' ? plan.price.annual : plan.price.monthly
            const annualSavings = getAnnualSavings(plan.price.monthly, plan.price.annual)

            return (
              <Card
                key={planId}
                className={`relative cursor-pointer transition-all ${
                  isRecommended
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                } ${
                  isCurrentPlan ? 'opacity-60' : ''
                }`}
                onClick={() => setSelectedPlan(planId as PlanId)}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 hover:bg-purple-600">
                      Recommended
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span>{plan.name}</span>
                  </CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      ${formatPrice(price)}
                      <span className="text-lg text-gray-400 font-normal">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-sm text-green-400">
                        Save ${formatPrice(annualSavings)}/year
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Credits信息 */}
                  <div className="flex items-center justify-center space-x-2 text-center">
                    <span className="text-lg font-semibold">{plan.credits} Credits</span>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* 功能列表 */}
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* 升级按钮 */}
                  <Button
                    onClick={() => handleUpgrade(planId as PlanId)}
                    disabled={isCurrentPlan || isUpgrading}
                    className={`w-full ${
                      isRecommended
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 安全和支持信息 */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <Shield className="w-4 h-4" />
            <span>Secure payment via Stripe</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
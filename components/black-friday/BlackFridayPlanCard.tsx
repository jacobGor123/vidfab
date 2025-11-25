"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap } from 'lucide-react'
import { getCouponCode } from '@/lib/black-friday/coupons'
import { cn } from '@/lib/utils'

export interface PlanFeature {
  text: string
  included: boolean
}

export interface PlanCardProps {
  planId: 'lite' | 'pro' | 'premium'
  planName: string
  originalPrice: number  // 美分
  discountedPrice: number  // 美分
  discount: number  // 折扣百分比
  billingCycle: 'monthly' | 'annual'
  credits: number
  features: PlanFeature[]
  highlighted?: boolean  // 是否高亮显示（BEST CHOICE）
  annualTotal?: number  // 年付总价（仅年付）
  annualSavings?: number  // 年付节省（仅年付）
  themeColor?: string  // 主题颜色
  onCheckout: (planId: 'lite' | 'pro' | 'premium', billingCycle: 'monthly' | 'annual', couponCode: string) => Promise<void>
}

export function BlackFridayPlanCard({
  planId,
  planName,
  originalPrice,
  discountedPrice,
  discount,
  billingCycle,
  credits,
  features,
  highlighted = false,
  annualTotal,
  annualSavings,
  themeColor = 'blue',
  onCheckout
}: PlanCardProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const couponCode = getCouponCode(planId, billingCycle)
      await onCheckout(planId, billingCycle, couponCode)
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2)
  }

  const getThemeColors = () => {
    switch (themeColor) {
      case 'blue':
        return {
          border: 'border-blue-500/30 hover:border-blue-500/50',
          gradient: 'from-blue-500 to-blue-600',
          check: 'text-blue-500',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
      case 'purple':
        return {
          border: 'border-purple-500/30 hover:border-purple-500/70',
          gradient: 'from-pink-500 to-purple-500',
          check: 'text-purple-500',
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        }
      case 'cyan':
        return {
          border: 'border-cyan-400/30 hover:border-cyan-400/50',
          gradient: 'from-cyan-400 to-cyan-600',
          check: 'text-cyan-400',
          badge: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30'
        }
      default:
        return {
          border: 'border-white/10 hover:border-white/20',
          gradient: 'from-gray-500 to-gray-600',
          check: 'text-gray-400',
          badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }
  }

  const colors = getThemeColors()

  return (
    <div
      className={cn(
        'relative bg-white/5 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300',
        colors.border,
        highlighted ? 'scale-105 z-10' : ''
      )}
    >
      {/* BEST CHOICE 标签 */}
      {highlighted && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg">
          BEST CHOICE
        </div>
      )}

      <div className="p-6 border-b border-white/10">
        {/* 套餐名称 */}
        <h3 className={cn(
          'text-xl font-bold mb-3',
          highlighted ? 'bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent' : ''
        )}>
          {planName}
        </h3>

        {/* 折扣标签 */}
        <Badge variant="outline" className={cn('mb-4', colors.badge)}>
          {discount}% OFF
        </Badge>

        {/* 价格 */}
        <div className="space-y-2">
          {/* 原价（划线） */}
          <div className="flex items-baseline gap-2">
            <span className="text-gray-500 line-through text-lg">
              ${formatPrice(originalPrice)}
            </span>
            <span className="text-sm text-gray-400">/mo</span>
          </div>

          {/* 折扣价 */}
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">${formatPrice(discountedPrice)}</span>
            <span className="text-gray-400 ml-2">/month</span>
          </div>

          {/* 年付额外信息 */}
          {billingCycle === 'annual' && annualTotal && (
            <div className="space-y-1">
              <p className="text-sm text-gray-400">
                Billed annually (${formatPrice(annualTotal)})
              </p>
              {annualSavings && (
                <p className="text-sm font-semibold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Save ${formatPrice(annualSavings)}/yr!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Credits */}
        <div className="mb-6">
          <p className="text-lg font-semibold text-white mb-1">
            {credits} credits/month
          </p>
          {billingCycle === 'annual' && (
            <p className="text-xs text-gray-400">Credits delivered every month</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Cancel at anytime</p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className={cn('h-4 w-4 mr-2 shrink-0 mt-0.5', colors.check)} />
              <span className="text-sm text-gray-300">{feature.text}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          onClick={handleCheckout}
          disabled={loading}
          className={cn(
            'w-full text-white font-semibold transition-all duration-300',
            highlighted
              ? `bg-gradient-to-r ${colors.gradient} hover:opacity-90 hover:scale-105`
              : `bg-${themeColor}-600 hover:bg-${themeColor}-700`
          )}
        >
          {loading ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Check Out'
          )}
        </Button>
      </div>
    </div>
  )
}

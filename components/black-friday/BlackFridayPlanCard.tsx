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
  saveColor?: 'cyan' | 'pink'  // Save 徽章颜色
  discountBadgeUrl?: string  // 折扣角标图片URL
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
  saveColor,
  discountBadgeUrl,
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
        'relative backdrop-blur-sm border rounded-xl transition-all duration-300 flex flex-col overflow-hidden',
        highlighted ? 'z-10' : 'bg-white/5',
        colors.border
      )}
      style={highlighted ? {
        background: 'linear-gradient(170deg, #1C104A 6.73%, #290C6C 98.63%)',
        height: '100%'
      } : { height: '100%' }}
    >
      {/* 折扣角标 */}
      {discountBadgeUrl && (
        <img
          src={discountBadgeUrl}
          alt="Discount Badge"
          className="absolute top-2 right-2 z-20"
          style={{ width: highlighted ? '100px' : '90px', height: 'auto' }}
        />
      )}

      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col gap-3">
          {/* 套餐名称 */}
          <h3 className={cn(
            'text-xl font-bold',
            highlighted ? 'bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent' : ''
          )}>
            {planName}
          </h3>

          {/* 年付省钱徽章 */}
          {billingCycle === 'annual' && annualSavings && (
            <span className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border w-fit',
              saveColor === 'pink'
                ? 'bg-pink-500/15 text-pink-100 border-pink-400/40'
                : 'bg-cyan-400/15 text-cyan-100 border-cyan-400/40'
            )}>
              Save ${formatPrice(annualSavings)}/yr!
            </span>
          )}

          {/* 价格 */}
          <div className="space-y-1 mt-1">
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">${formatPrice(discountedPrice)}</span>
              <span className="text-gray-400 ml-2">/month</span>
            </div>

            {billingCycle === 'monthly' && (
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 line-through text-lg">
                  ${formatPrice(originalPrice)}
                </span>
                <span className="text-sm text-gray-400">/month</span>
              </div>
            )}

            {billingCycle === 'annual' && annualTotal && (
              <p className="text-sm text-gray-400">
                Billed yearly as ${formatPrice(annualTotal)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        {/* Features */}
        <ul className="space-y-3 mb-6 flex-grow">
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

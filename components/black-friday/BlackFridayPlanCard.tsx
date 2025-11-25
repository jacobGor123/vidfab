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
  discountImage?: string  // 右上角折扣图片 URL
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
  discountImage,
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
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          saveBadge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
        }
      case 'purple':
        return {
          border: 'border-purple-500/30 hover:border-purple-500/70',
          gradient: 'from-pink-500 to-purple-500',
          check: 'text-purple-500',
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          saveBadge: 'bg-pink-500/20 text-pink-400 border-pink-500/50'
        }
      case 'cyan':
        return {
          border: 'border-cyan-400/30 hover:border-cyan-400/50',
          gradient: 'from-cyan-400 to-cyan-600',
          check: 'text-cyan-400',
          badge: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30',
          saveBadge: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50'
        }
      default:
        return {
          border: 'border-white/10 hover:border-white/20',
          gradient: 'from-gray-500 to-gray-600',
          check: 'text-gray-400',
          badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          saveBadge: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }
  }

  const colors = getThemeColors()

  return (
    <div
      className={cn(
        'relative backdrop-blur-sm border-2 rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full',
        highlighted
          ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 z-10'
          : cn('border', colors.border, 'bg-white/5')
      )}
      style={highlighted ? {
        background: 'linear-gradient(170deg, #1C104A 6.73%, #290C6C 98.63%)'
      } : undefined}
    >
      {/* 右上角折扣图片 */}
      {discountImage && (
        <img
          src={discountImage}
          alt={`${discount}% OFF`}
          className="absolute top-2 right-2 w-20 h-auto z-10"
        />
      )}

      <div className="p-6 border-b border-white/10">
        {/* 套餐名称 */}
        <h3
          className={cn(
            'text-xl font-bold mb-2',
            highlighted && 'bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent'
          )}
        >
          {planName}
        </h3>

        {/* 徽章区域 - 固定高度确保对齐 */}
        <div className="h-6 mb-1">
          {billingCycle === 'annual' && annualSavings && (
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold', colors.saveBadge)}
            >
              Save ${formatPrice(annualSavings)}/yr!
            </Badge>
          )}
        </div>

        {/* 价格区域 - 固定高度确保对齐 */}
        <div className="space-y-1 min-h-[72px]">
          {/* 折扣价 */}
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">${formatPrice(discountedPrice)}</span>
            <span className="text-gray-400 ml-2">/month</span>
          </div>

          {/* 月付划线原价 */}
          {billingCycle === 'monthly' && (
            <p className="text-sm text-gray-500 line-through">
              ${formatPrice(originalPrice)} /month
            </p>
          )}

          {/* 年付额外信息 */}
          {billingCycle === 'annual' && annualTotal && (
            <p className="text-sm text-gray-400">
              Billed yearly as ${formatPrice(annualTotal)}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        {/* Features - 固定最小高度确保按钮对齐 */}
        <ul className="space-y-3 flex-grow min-h-[280px]">
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
            'w-full text-white font-semibold transition-all duration-300 mt-6',
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

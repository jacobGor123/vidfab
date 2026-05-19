"use client"

import { Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserSubscription } from "@/lib/subscription/types"

interface CreditsBalanceCardProps {
  subscription: UserSubscription | null
  creditsRemaining: number
  isLoading: boolean
}

/**
 * 积分余额卡（Subscription Plan 页面右上区）
 *
 * 改版前（PDF 第 5 部分红框）：含 "X% remaining" 进度条 + "100 credits/month"
 *   - bug：百分比超 100%（如 301.0%），因为月度配额会累积上月剩余
 * 改版后：去掉进度条与百分比，只展示
 *   - 当前现有积分（醒目大数字）
 *   - 本月已消耗
 *   - 下次重置说明
 */
export function CreditsBalanceCard({
  subscription,
  creditsRemaining,
  isLoading,
}: CreditsBalanceCardProps) {
  const t = useTranslations('studio.creditsBalanceCard')

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-500" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasPaidCredits = subscription?.plan_id !== 'free' && (subscription?.status === 'active' || subscription?.status === 'cancelled')
  const monthlyTotal = subscription?.credits_monthly_total ?? 0
  const monthlyBalance = subscription?.credits_monthly_balance ?? 0
  const hasMonthlyData =
    hasPaidCredits && monthlyTotal > 0
  const creditsUsed = hasMonthlyData
    ? Math.max(0, monthlyTotal - monthlyBalance)
    : null

  return (
    <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-cyan-500" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 当前现有积分 — 醒目大数字 */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{creditsRemaining}</span>
          <span className="text-gray-400 text-sm">{t('available')}</span>
        </div>

        {/* 本月已消耗 */}
        <div className="flex justify-between items-center text-sm text-gray-400 pt-2 border-t border-white/5">
          <span>{t('usedThisMonth')}</span>
          <span className="font-medium text-white">
            {creditsUsed !== null ? creditsUsed : '—'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { Wallet, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { UserSubscription } from "@/lib/subscription/types"

interface CreditsBalanceCardProps {
  subscription: UserSubscription | null
  creditsRemaining: number
  isLoading: boolean
}

export function CreditsBalanceCard({
  subscription,
  creditsRemaining,
  isLoading
}: CreditsBalanceCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-500" />
            Credits Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-800 rounded w-1/2"></div>
            <div className="h-2 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 获取套餐配置的月度积分额度（每月新增的标准配额）
  const monthlyCredits = subscription?.plan_id === 'lite' ? 300 :
                         subscription?.plan_id === 'pro' ? 1000 :
                         subscription?.plan_id === 'premium' ? 2000 :
                         subscription?.plan_id === 'free' ? 50 : 50

  // 从订阅信息中获取本月总可用积分（包含上月剩余）
  // 这个字段由后端提供，表示本月开始时的总可用积分
  const monthlyTotal = subscription?.credits_monthly_total

  // 如果后端没有提供 credits_monthly_total，我们无法准确计算本月使用量
  // 因此显示总积分而不是月度使用情况
  const hasMonthlyData = monthlyTotal !== undefined && monthlyTotal !== null

  // 计算本月使用量（仅当有月度数据时）
  const creditsUsed = hasMonthlyData ? Math.max(0, monthlyTotal - creditsRemaining) : 0

  // 计算使用百分比
  // 如果有月度数据，基于月度总额计算；否则基于标准配额计算
  const totalForPercentage = hasMonthlyData ? monthlyTotal : monthlyCredits
  const usagePercentage = totalForPercentage > 0 ? (creditsRemaining / totalForPercentage) * 100 : 0

  // 判断是否有积分累积（本月总可用 > 标准月度配额）
  const hasAccumulated = hasMonthlyData && monthlyTotal > monthlyCredits

  // 警告等级判断
  const getWarningLevel = () => {
    if (usagePercentage >= 50) return 'safe'
    if (usagePercentage >= 20) return 'warning'
    return 'critical'
  }

  const warningLevel = getWarningLevel()

  const warningConfig = {
    safe: {
      color: 'text-green-500',
      bgColor: 'from-green-500/20 to-cyan-500/20',
      progressColor: 'bg-gradient-to-r from-green-500 to-cyan-500',
      icon: TrendingUp
    },
    warning: {
      color: 'text-yellow-500',
      bgColor: 'from-yellow-500/20 to-orange-500/20',
      progressColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      icon: TrendingDown
    },
    critical: {
      color: 'text-red-500',
      bgColor: 'from-red-500/20 to-pink-500/20',
      progressColor: 'bg-gradient-to-r from-red-500 to-pink-500',
      icon: TrendingDown
    }
  }

  const config = warningConfig[warningLevel]
  const TrendIcon = config.icon

  return (
    <Card className={`bg-gradient-to-br ${config.bgColor} border-gray-700`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-cyan-500" />
          Credits Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 积分余额 */}
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${config.color}`}>
            {creditsRemaining}
          </span>
          <span className="text-gray-400 text-sm">
            {hasMonthlyData ? ` / ${monthlyTotal} monthly` : ' credits available'}
          </span>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <Progress
            value={usagePercentage}
            className="h-3 bg-gray-800"
            indicatorClassName={config.progressColor}
          />
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <TrendIcon className="h-3 w-3" />
              {`${usagePercentage.toFixed(1)}% remaining`}
            </span>
            <span>
              {hasMonthlyData ? `${creditsUsed} used this month` : `${monthlyCredits} credits/month`}
            </span>
          </div>
        </div>

        {/* 警告提示 */}
        {warningLevel === 'critical' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Credits running low! Consider upgrading your plan.
            </p>
          </div>
        )}

        {warningLevel === 'warning' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              You're using credits quickly this month.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
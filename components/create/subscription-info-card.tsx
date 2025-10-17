"use client"

import { Crown, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UserSubscription } from "@/lib/subscription/types"
import { format } from "date-fns"

interface SubscriptionInfoCardProps {
  subscription: UserSubscription | null
  isLoading: boolean
}

export function SubscriptionInfoCard({ subscription, isLoading }: SubscriptionInfoCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-800 rounded w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">No subscription data available</p>
        </CardContent>
      </Card>
    )
  }

  // 状态图标和颜色映射
  const statusConfig = {
    active: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      label: "Active"
    },
    cancelled: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      label: "Cancelled"
    },
    expired: {
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      label: "Expired"
    },
    past_due: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      label: "Past Due"
    }
  }

  const currentStatus = statusConfig[subscription.status as keyof typeof statusConfig] || statusConfig.expired
  const StatusIcon = currentStatus.icon

  // 套餐名称格式化
  const planName = subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1)

  // 计费周期格式化
  const billingCycle = subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-500" />
          Subscription Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 套餐名称 */}
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            {planName} Plan
            {subscription.plan_id !== 'free' && (
              <Crown className="h-5 w-5 text-yellow-500" />
            )}
          </h3>
        </div>

        {/* 状态标签 */}
        <div className="flex items-center gap-2">
          <Badge
            className={`${currentStatus.bgColor} ${currentStatus.borderColor} ${currentStatus.color} border`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {currentStatus.label}
          </Badge>
          <Badge variant="outline" className="border-gray-700 text-gray-400">
            {billingCycle}
          </Badge>
        </div>

        {/* 详细信息 */}
        <div className="space-y-2 text-sm">
          {subscription.period_end && subscription.status === 'active' && (
            <div className="flex justify-between items-center text-gray-400">
              <span>Next billing:</span>
              <span className="font-medium text-white">
                {format(new Date(subscription.period_end), 'MMM dd, yyyy')}
              </span>
            </div>
          )}

          {subscription.auto_renew !== undefined && (
            <div className="flex justify-between items-center text-gray-400">
              <span>Auto-renew:</span>
              <span className={`font-medium ${subscription.auto_renew ? 'text-green-500' : 'text-gray-400'}`}>
                {subscription.auto_renew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )}

          {subscription.stripe_subscription_id && (
            <div className="flex justify-between items-center text-gray-400">
              <span>Subscription ID:</span>
              <span className="font-mono text-xs text-gray-500">
                {subscription.stripe_subscription_id.slice(-12)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
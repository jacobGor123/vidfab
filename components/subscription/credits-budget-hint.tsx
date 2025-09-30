"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Zap,
  AlertTriangle,
  Crown,
  ArrowRight,
  Calculator,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import { calculateCreditsRequired } from "@/lib/subscription/pricing-config"

interface CreditsBudgetHintProps {
  model: string
  duration: string
  resolution: string
  onUpgradeClick?: () => void
  className?: string
}

export function CreditsBudgetHint({
  model,
  duration,
  resolution,
  onUpgradeClick,
  className = ""
}: CreditsBudgetHintProps) {
  const { data: session } = useSession()
  const {
    subscription,
    creditsRemaining,
    isLoading: subscriptionLoading,
    checkCreditsAvailability,
    canAccessModel
  } = useSubscription()

  const [budgetInfo, setBudgetInfo] = useState<any>(null)
  const [modelAccess, setModelAccess] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)

  // 检查Credits预算和模型权限
  useEffect(() => {
    if (!session?.user?.uuid || !model || !duration || !resolution) {
      setBudgetInfo(null)
      setModelAccess(null)
      return
    }

    const checkBudget = async () => {
      setIsChecking(true)
      try {
        const [budget, access] = await Promise.all([
          checkCreditsAvailability(model, resolution, duration),
          canAccessModel(model, resolution)
        ])
        setBudgetInfo(budget)
        setModelAccess(access)
      } catch (error) {
        console.error('检查Credits预算失败:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkBudget()
  }, [session?.user?.uuid, model, duration, resolution, checkCreditsAvailability, canAccessModel])

  // 如果用户未登录，不显示任何提示
  if (!session?.user?.uuid) {
    return null
  }

  // 加载中状态
  if (subscriptionLoading || isChecking) {
    return (
      <Card className={`bg-gray-950 border-gray-800 ${className}`}>
        <CardContent className="pt-4">
          <div className="animate-pulse flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 计算所需Credits
  const requiredCredits = calculateCreditsRequired(model, resolution, duration)

  // 获取用户计划信息
  const userPlan = subscription?.plan_id || 'free'
  const planName = userPlan === 'free' ? 'Free' : userPlan.charAt(0).toUpperCase() + userPlan.slice(1)

  // 权限检查结果
  const canAccess = modelAccess?.can_access ?? false
  const accessReason = modelAccess?.reason || ''

  // 预算检查结果
  const canAfford = budgetInfo?.can_afford ?? false
  const warningLevel = budgetInfo?.warning_level || 'safe'
  const remainingJobs = budgetInfo?.remaining_jobs || 0

  // 确定显示状态
  let status: 'success' | 'warning' | 'error' | 'blocked' = 'success'
  let statusIcon = <CheckCircle className="w-5 h-5 text-green-400" />
  let statusMessage = ''

  if (!canAccess) {
    status = 'blocked'
    statusIcon = <XCircle className="w-5 h-5 text-red-400" />
    statusMessage = accessReason
  } else if (!canAfford) {
    status = 'error'
    statusIcon = <XCircle className="w-5 h-5 text-red-400" />
    statusMessage = `Insufficient credits. Need ${requiredCredits}, have ${creditsRemaining}`
  } else if (warningLevel === 'warning') {
    status = 'warning'
    statusIcon = <AlertTriangle className="w-5 h-5 text-yellow-400" />
    statusMessage = `Low credits. ${remainingJobs} jobs remaining after this`
  } else {
    statusMessage = `${remainingJobs} jobs remaining after this`
  }

  return (
    <Card className={`bg-gray-950 border-gray-800 ${className}`}>
      <CardContent className="pt-4 space-y-3">
        {/* 当前计划和Credits余额 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {userPlan === 'free' ? (
              <Zap className="w-4 h-4 text-blue-400" />
            ) : (
              <Crown className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-sm text-gray-300">{planName} Plan</span>
            <Badge variant="outline" className="text-xs">
              {creditsRemaining} credits
            </Badge>
          </div>
        </div>

        {/* Credits消费和预算信息 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">This generation:</span>
            <span className="text-white font-medium">{requiredCredits} credits</span>
          </div>
        </div>

        {/* 状态提示 */}
        <div className="flex items-start space-x-2">
          {statusIcon}
          <div className="flex-1">
            <p className={`text-sm ${
              status === 'success' ? 'text-green-400' :
              status === 'warning' ? 'text-yellow-400' :
              status === 'error' ? 'text-red-400' :
              'text-red-400'
            }`}>
              {statusMessage}
            </p>
          </div>
        </div>

        {/* 升级提示 */}
        {(status === 'blocked' || status === 'error' || (status === 'warning' && warningLevel === 'critical')) && (
          <Alert className="border-purple-500/30 bg-purple-500/10">
            <Crown className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-purple-300">
              {status === 'blocked'
                ? "Upgrade to access this model and higher resolutions"
                : "Consider upgrading for more credits and advanced features"
              }
              <Button
                variant="link"
                size="sm"
                className="text-purple-400 hover:text-purple-300 p-0 h-auto ml-2"
                onClick={onUpgradeClick}
              >
                Upgrade Now
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Free用户的模型限制提示 */}
        {userPlan === 'free' && (model !== 'vidu-q1' || resolution === '1080p') && (
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-xs">
              Free users can only use Vidfab Q1 model with up to 720p resolution.
              <Button
                variant="link"
                size="sm"
                className="text-blue-400 hover:text-blue-300 p-0 h-auto ml-2"
                onClick={onUpgradeClick}
              >
                Upgrade for full access
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
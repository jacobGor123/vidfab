/**
 * 订阅状态管理Hook
 * 提供用户订阅信息、Credits余额、权限检查等功能
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type {
  UserSubscription,
  PlanId,
  CreditsBudgetInfo,
  ModelAccessCheck,
  SubscriptionPlan
} from '@/lib/subscription/types'

interface UseSubscriptionReturn {
  // 订阅状态
  subscription: UserSubscription | null
  planLimits: SubscriptionPlan['limits'] | null
  creditsRemaining: number
  isLoading: boolean
  error: string | null

  // 权限检查
  canAccessModel: (model: string, resolution?: string) => Promise<ModelAccessCheck>
  checkCreditsAvailability: (model: string, resolution: string, duration: string) => Promise<CreditsBudgetInfo>
  canStartNewJob: () => boolean

  // 操作方法
  refreshSubscription: () => Promise<void>
  upgradeSubscription: (planId: PlanId, billingCycle: 'monthly' | 'annual') => Promise<void>
}

export function useSubscription(): UseSubscriptionReturn {
  const { data: session, status: sessionStatus } = useSession()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [planLimits, setPlanLimits] = useState<SubscriptionPlan['limits'] | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取订阅状态
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!session?.user?.uuid) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/subscription/status')
      const data = await response.json()

      if (data.success) {
        setSubscription(data.subscription)
        setPlanLimits(data.plan_limits)
        setCreditsRemaining(data.credits_remaining || 0)
      } else {
        setError(data.error || 'Failed to fetch subscription status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.uuid])

  // 刷新订阅状态
  const refreshSubscription = useCallback(async () => {
    setIsLoading(true)
    await fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus])

  // 检查模型访问权限
  const canAccessModel = useCallback(async (
    model: string,
    resolution?: string
  ): Promise<ModelAccessCheck> => {
    if (!session?.user?.uuid) {
      return {
        model,
        user_plan: 'free',
        resolution,
        can_access: false,
        reason: 'User not authenticated'
      }
    }

    try {
      // 映射前端模型名称到后端识别的名称
      const modelForCredits = model === 'vidfab-q1' ? 'seedance-v1-pro-t2v' :
                             model === 'vidfab-pro' ? 'veo3-fast' :
                             model

      // 为视频特效特殊处理参数
      const requestBody = model === 'video-effects'
        ? {
            model: modelForCredits,
            resolution: 'standard', // 视频特效没有分辨率概念
            duration: '4s', // 视频特效固定4秒
          }
        : {
            model: modelForCredits,
            resolution: resolution || '720p',
            duration: '5s', // 默认时长用于权限检查
          }

      const response = await fetch('/api/subscription/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success && data.model_access) {
        return data.model_access
      } else {
        return {
          model,
          user_plan: subscription?.plan_id || 'free',
          resolution,
          can_access: false,
          reason: data.error || 'Access denied'
        }
      }
    } catch (err: any) {
      return {
        model,
        user_plan: subscription?.plan_id || 'free',
        resolution,
        can_access: false,
        reason: 'Network error'
      }
    }
  }, [session?.user?.uuid, subscription?.plan_id])

  // 检查Credits可用性
  const checkCreditsAvailability = useCallback(async (
    model: string,
    resolution: string,
    duration: string
  ): Promise<CreditsBudgetInfo> => {
    if (!session?.user?.uuid) {
      return {
        current_balance: 0,
        required_credits: 0,
        can_afford: false,
        warning_level: 'critical',
        remaining_jobs: 0
      }
    }

    try {
      // 映射前端模型名称到后端识别的名称
      const modelForCredits = model === 'vidfab-q1' ? 'seedance-v1-pro-t2v' :
                             model === 'vidfab-pro' ? 'veo3-fast' :
                             model

      // 为视频特效特殊处理参数
      const requestBody = model === 'video-effects'
        ? {
            model: modelForCredits,
            resolution: 'standard', // 视频特效没有分辨率概念
            duration: '4s', // 视频特效固定4秒
          }
        : {
            model: modelForCredits,
            resolution,
            duration,
          }

      const response = await fetch('/api/subscription/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        return {
          current_balance: data.current_balance,
          required_credits: data.required_credits,
          can_afford: data.can_afford,
          warning_level: data.warning_level,
          remaining_jobs: data.remaining_jobs
        }
      } else {
        return {
          current_balance: creditsRemaining,
          required_credits: 0,
          can_afford: false,
          warning_level: 'critical',
          remaining_jobs: 0
        }
      }
    } catch (err: any) {
      return {
        current_balance: creditsRemaining,
        required_credits: 0,
        can_afford: false,
        warning_level: 'critical',
        remaining_jobs: 0
      }
    }
  }, [session?.user?.uuid, creditsRemaining])

  // 检查是否可以启动新任务
  const canStartNewJob = useCallback((): boolean => {
    if (!planLimits) return false

    // 这里可以添加并发任务检查逻辑
    // 暂时返回true，实际应该检查当前运行的任务数
    return true
  }, [planLimits])

  // 升级订阅
  const upgradeSubscription = useCallback(async (
    planId: PlanId,
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!session?.user?.uuid) {
      throw new Error('User not authenticated')
    }

    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upgrade',
          plan_id: planId,
          billing_cycle: billingCycle,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.checkout_url) {
          // 需要跳转到结账页面
          window.location.href = data.checkout_url
        } else {
          // 直接升级成功，刷新状态
          await refreshSubscription()
        }
      } else {
        throw new Error(data.error || 'Failed to upgrade subscription')
      }
    } catch (err: any) {
      throw new Error(err.message || 'Network error')
    }
  }, [session?.user?.uuid, refreshSubscription])

  // 初始化和会话变化时获取订阅状态
  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (session?.user?.uuid) {
      fetchSubscriptionStatus()
    } else {
      setIsLoading(false)
      setSubscription(null)
      setPlanLimits(null)
      setCreditsRemaining(0)
    }
  }, [session?.user?.uuid, sessionStatus, fetchSubscriptionStatus])

  // 🔥 监听积分更新事件，实时更新积分余额
  useEffect(() => {
    const handleCreditsUpdate = (event: CustomEvent) => {
      const { creditsRemaining: newCreditsRemaining, creditsConsumed } = event.detail

      console.log(`🔄 积分余额实时更新 - 新余额: ${newCreditsRemaining}, 本次消费: ${creditsConsumed}`)

      // 立即更新积分余额
      setCreditsRemaining(newCreditsRemaining)

      // 同时更新订阅信息中的积分
      setSubscription(prev => prev ? {
        ...prev,
        credits_remaining: newCreditsRemaining
      } : null)
    }

    // 监听积分更新事件
    window.addEventListener('credits-updated', handleCreditsUpdate as EventListener)

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdate as EventListener)
    }
  }, [])

  return {
    subscription,
    planLimits,
    creditsRemaining,
    isLoading,
    error,
    canAccessModel,
    checkCreditsAvailability,
    canStartNewJob,
    refreshSubscription,
    upgradeSubscription,
  }
}
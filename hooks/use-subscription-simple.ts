/**
 * 简化的订阅状态管理Hook（参考iMideo模式）
 * 使用简单的积分检查，移除复杂的权限验证
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { calculateRequiredCredits, hasEnoughCredits, type VideoModel } from '@/lib/credits-calculator'

// 简化的用户积分信息
interface UserCreditsInfo {
  credits: number
  is_pro: boolean
  is_recharged: boolean
  plan_type: string
  subscription?: {
    status: string
    plan: string
  } | null
}

// 简化的积分检查结果
interface SimpleCreditsBudgetInfo {
  current_balance: number
  required_credits: number
  can_afford: boolean
  warning_level: 'none' | 'low' | 'critical'
  remaining_jobs: number
}

// 简化的模型访问检查
interface SimpleModelAccessCheck {
  model: string
  user_plan: string
  can_access: boolean
  reason?: string
}

interface UseSimpleSubscriptionReturn {
  // 用户积分状态
  creditsInfo: UserCreditsInfo | null
  creditsRemaining: number
  isLoading: boolean
  error: string | null
  isPro: boolean

  // 简化的检查方法
  checkCreditsAvailability: (model: VideoModel, resolution: string, duration: string) => Promise<SimpleCreditsBudgetInfo>
  canAccessModel: (model: VideoModel, resolution?: string) => Promise<SimpleModelAccessCheck>
  hasEnoughCreditsForVideo: (model: VideoModel, resolution: string, duration: string) => boolean

  // 刷新方法
  refreshCredits: () => Promise<void>
}

export function useSimpleSubscription(): UseSimpleSubscriptionReturn {
  const { data: session, status: sessionStatus } = useSession()
  const [creditsInfo, setCreditsInfo] = useState<UserCreditsInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🎯 简单获取用户积分信息（参考iMideo模式）
  const fetchCreditsInfo = useCallback(async () => {
    if (!session?.user?.uuid) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // 🔥 调用简单的积分API
      const response = await fetch('/api/user/credits')
      const data = await response.json()

      if (data.success) {
        setCreditsInfo(data.data)
      } else {
        setError(data.error || 'Failed to fetch credits')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
      console.error('Failed to fetch credits:', err)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.uuid])

  // 刷新积分信息
  const refreshCredits = useCallback(async () => {
    setIsLoading(true)
    await fetchCreditsInfo()
  }, [fetchCreditsInfo])

  // 🎯 简单的积分可用性检查（本地计算）
  const checkCreditsAvailability = useCallback(async (
    model: VideoModel,
    resolution: string,
    duration: string
  ): Promise<SimpleCreditsBudgetInfo> => {
    if (!creditsInfo) {
      return {
        current_balance: 0,
        required_credits: 0,
        can_afford: false,
        warning_level: 'critical',
        remaining_jobs: 0
      }
    }

    try {
      // 🔥 本地计算所需积分（高性能，无API调用）
      const requiredCredits = calculateRequiredCredits(model, resolution, duration)
      const currentBalance = creditsInfo.credits
      const canAfford = hasEnoughCredits(currentBalance, model, resolution, duration)

      // 计算警告级别
      let warningLevel: 'none' | 'low' | 'critical' = 'none'
      if (currentBalance === 0) {
        warningLevel = 'critical'
      } else if (currentBalance < requiredCredits * 2) {
        warningLevel = 'low'
      }

      // 计算可以生成多少个视频
      const remainingJobs = Math.floor(currentBalance / requiredCredits)

      return {
        current_balance: currentBalance,
        required_credits: requiredCredits,
        can_afford: canAfford,
        warning_level: warningLevel,
        remaining_jobs: remainingJobs
      }
    } catch (err) {
      console.error('Error calculating credits:', err)
      return {
        current_balance: creditsInfo.credits,
        required_credits: 0,
        can_afford: false,
        warning_level: 'critical',
        remaining_jobs: 0
      }
    }
  }, [creditsInfo])

  // 🎯 简化的模型访问检查
  const canAccessModel = useCallback(async (
    model: VideoModel,
    resolution?: string
  ): Promise<SimpleModelAccessCheck> => {
    if (!creditsInfo) {
      return {
        model,
        user_plan: 'free',
        can_access: false,
        reason: 'Please upgrade to access this feature' // 🔥 更友好的提示
      }
    }

    // 🔥 简单的权限规则（参考iMideo模式）
    const isPro = creditsInfo.is_pro
    const userPlan = creditsInfo.plan_type

    // 基本权限检查
    if (model === 'veo3-fast' && !isPro) {
      return {
        model,
        user_plan: userPlan,
        can_access: false,
        reason: 'Veo3 model requires Pro subscription'
      }
    }

    if (resolution === '1080p' && !isPro) {
      return {
        model,
        user_plan: userPlan,
        can_access: false,
        reason: '1080p resolution requires Pro subscription'
      }
    }

    return {
      model,
      user_plan: userPlan,
      can_access: true
    }
  }, [creditsInfo])

  // 🎯 本地检查是否有足够积分（即时响应）
  const hasEnoughCreditsForVideo = useCallback((
    model: VideoModel,
    resolution: string,
    duration: string
  ): boolean => {
    if (!creditsInfo) return false
    return hasEnoughCredits(creditsInfo.credits, model, resolution, duration)
  }, [creditsInfo])

  // 初始化和用户变化时获取积分
  useEffect(() => {
    if (session?.user?.uuid) {
      fetchCreditsInfo()
    } else {
      setCreditsInfo(null)
      setIsLoading(false)
    }
  }, [session?.user?.uuid, fetchCreditsInfo])

  // 🔥 监听积分更新事件（视频完成时自动刷新积分）
  useEffect(() => {
    const handleCreditsUpdate = () => {
      console.log('🔄 收到积分更新事件，刷新积分信息')
      refreshCredits()
    }

    // 监听 credits-updated 事件
    window.addEventListener('credits-updated', handleCreditsUpdate)

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdate)
    }
  }, [refreshCredits])

  return {
    creditsInfo,
    creditsRemaining: creditsInfo?.credits || 0,
    isLoading,
    error,
    isPro: creditsInfo?.is_pro || false,
    checkCreditsAvailability,
    canAccessModel,
    hasEnoughCreditsForVideo,
    refreshCredits
  }
}

// 导出类型
export type { UserCreditsInfo, SimpleCreditsBudgetInfo, SimpleModelAccessCheck }
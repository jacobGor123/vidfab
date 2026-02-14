/**
 * 脚本创建配额状态管理 Hook
 * 用于获取和显示用户的月度脚本创建配额
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface ScriptQuotaStatus {
  planId: 'free' | 'lite' | 'pro' | 'premium'
  monthlyQuota: number
  currentUsage: number
  remainingFree: number
  month: string
}

interface UseScriptQuotaReturn {
  quotaStatus: ScriptQuotaStatus | null
  isLoading: boolean
  error: string | null
  refreshQuota: () => Promise<void>
}

export function useScriptQuota(): UseScriptQuotaReturn {
  const { data: session } = useSession()
  const [quotaStatus, setQuotaStatus] = useState<ScriptQuotaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotaStatus = useCallback(async () => {
    if (!session?.user?.uuid) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/video-agent/quota-status')
      const data = await response.json()

      if (data.success) {
        setQuotaStatus(data.data)
      } else {
        setError(data.error || 'Failed to fetch quota status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
      console.error('[useScriptQuota] Failed to fetch quota status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.uuid])

  const refreshQuota = useCallback(async () => {
    setIsLoading(true)
    await fetchQuotaStatus()
  }, [fetchQuotaStatus])

  // 初始化和用户变化时获取配额
  useEffect(() => {
    if (session?.user?.uuid) {
      fetchQuotaStatus()
    } else {
      setQuotaStatus(null)
      setIsLoading(false)
    }
  }, [session?.user?.uuid, fetchQuotaStatus])

  return {
    quotaStatus,
    isLoading,
    error,
    refreshQuota
  }
}

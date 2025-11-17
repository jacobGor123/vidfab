/**
 * Image Polling Hook V2
 * 基于统一轮询引擎的新版图片轮询 Hook
 *
 * 迁移指南:
 * - 旧版本: /hooks/use-image-polling.ts (保留作为V1)
 * - 新版本: /hooks/use-image-polling-v2.ts (本文件)
 *
 * 主要改进:
 * 1. 基于 useUnifiedPolling 统一引擎
 * 2. 更简洁的实现(~100行 vs ~450行)
 * 3. 更好的错误处理
 * 4. 自动健康检查
 * 5. 智能存储重试
 */

import { useCallback, useMemo } from "react"
import { IMAGE_POLLING_CONFIG, type PollingConfig } from "@/lib/polling/polling-config"
import { useUnifiedPolling, type PollingStatusResponse } from "./use-unified-polling"

/**
 * 图片任务数据
 */
interface ImageJobData {
  userId?: string
  userEmail?: string
  prompt?: string
  settings?: any
}

/**
 * Hook 配置选项
 */
interface UseImagePollingV2Options {
  /** 是否启用轮询 */
  enabled?: boolean

  /** 自定义配置 */
  config?: Partial<PollingConfig>

  /** 轮询间隔(优先级高于config) */
  interval?: number

  /** 默认用户ID */
  userId?: string

  /** 默认用户邮箱 */
  userEmail?: string

  /** 完成回调 */
  onCompleted?: (requestId: string, imageUrl: string) => void

  /** 失败回调 */
  onFailed?: (requestId: string, error: string) => void

  /** 存储完成回调 */
  onStored?: (requestId: string, imageId: string) => void
}

/**
 * Hook 返回值
 */
interface UseImagePollingV2Return {
  /** 是否正在轮询 */
  isPolling: boolean

  /** 轮询任务数量 */
  pollingCount: number

  /** 开始轮询 */
  startPolling: (requestId: string, localId: string, jobData?: {
    userId?: string
    userEmail?: string
    prompt?: string
    settings?: any
  }) => void

  /** 停止轮询 */
  stopPolling: (requestId?: string) => void

  /** 停止所有轮询 */
  stopAllPolling: () => void
}

/**
 * 图片轮询 Hook V2
 *
 * @example
 * ```tsx
 * const imagePolling = useImagePollingV2({
 *   userId: 'user-123',
 *   userEmail: 'user@example.com',
 *   onCompleted: (requestId, url) => {
 *     console.log('Image completed:', url)
 *   },
 *   onFailed: (requestId, error) => {
 *     console.error('Image failed:', error)
 *   },
 *   onStored: (requestId, imageId) => {
 *     console.log('Image stored:', imageId)
 *   }
 * })
 *
 * // 开始轮询
 * imagePolling.startPolling(requestId, localId, {
 *   prompt: 'A beautiful sunset',
 *   settings: { model: 'flux-pro' }
 * })
 *
 * // 停止轮询
 * imagePolling.stopPolling(requestId)
 * ```
 */
export function useImagePollingV2(
  options: UseImagePollingV2Options = {}
): UseImagePollingV2Return {
  const {
    enabled = true,
    config: customConfig,
    interval: customInterval,
    userId: defaultUserId,
    userEmail: defaultUserEmail,
    onCompleted,
    onFailed,
    onStored
  } = options

  // 合并配置
  const pollingConfig = useMemo((): PollingConfig => ({
    ...IMAGE_POLLING_CONFIG,
    ...customConfig,
    ...(customInterval ? { interval: customInterval } : {})
  }), [customConfig, customInterval])

  /**
   * 状态查询函数
   */
  const fetchStatus = useCallback(async (
    requestId: string,
    signal: AbortSignal
  ): Promise<PollingStatusResponse> => {
    const response = await fetch(`/api/image/status/${requestId}`, {
      method: 'GET',
      signal,
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      status: data.data.status,
      outputs: data.data.outputs,
      error: data.data.error
    }
  }, [])

  /**
   * 数据库存储函数
   */
  const saveToDatabase = useCallback(async ({ job, output }: {
    job: { requestId: string; localId: string; data?: ImageJobData }
    output: string
  }) => {
    const jobData = job.data || {}

    const response = await fetch('/api/image/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: jobData.userId || defaultUserId,
        userEmail: jobData.userEmail || defaultUserEmail || 'unknown@vidfab.ai',
        wavespeedRequestId: job.requestId,
        originalUrl: output,
        settings: {
          ...jobData.settings,
          prompt: jobData.prompt
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success || !data.data.imageId) {
      throw new Error(data.error || 'Storage failed')
    }

    return {
      success: true,
      id: data.data.imageId
    }
  }, [defaultUserId, defaultUserEmail])

  /**
   * 完成回调处理
   */
  const handleCompleted = useCallback((requestId: string, output: string) => {
    onCompleted?.(requestId, output)
  }, [onCompleted])

  /**
   * 失败回调处理
   */
  const handleFailed = useCallback((requestId: string, error: any) => {
    console.error(`❌ Image ${requestId} failed:`, error.getUserMessage?.() || error.message)
    onFailed?.(requestId, error.getUserMessage?.() || error.message || 'Unknown error')
  }, [onFailed])

  /**
   * 存储完成回调
   */
  const handleStored = useCallback((requestId: string, imageId: string) => {
    onStored?.(requestId, imageId)
  }, [onStored])

  // 使用统一轮询引擎
  const unifiedPolling = useUnifiedPolling<ImageJobData>({
    config: pollingConfig,
    enabled,
    fetchStatus,
    saveToDatabase,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onStored: handleStored
  })

  /**
   * 开始轮询
   */
  const startPolling = useCallback((
    requestId: string,
    localId: string,
    jobData?: {
      userId?: string
      userEmail?: string
      prompt?: string
      settings?: any
    }
  ) => {

    const imageJobData: ImageJobData = {
      userId: jobData?.userId,
      userEmail: jobData?.userEmail,
      prompt: jobData?.prompt,
      settings: jobData?.settings
    }

    unifiedPolling.startPolling(requestId, localId, imageJobData)
  }, [unifiedPolling])

  /**
   * 停止轮询
   */
  const stopPolling = useCallback((requestId?: string) => {
    if (requestId) {
      unifiedPolling.stopPolling(requestId)
    } else {
      unifiedPolling.stopAllPolling()
    }
  }, [unifiedPolling])

  return {
    isPolling: unifiedPolling.isPolling,
    pollingCount: unifiedPolling.pollingCount,
    startPolling,
    stopPolling,
    stopAllPolling: unifiedPolling.stopAllPolling
  }
}

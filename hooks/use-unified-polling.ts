/**
 * 通用轮询引擎 Hook
 * 支持视频、图片等多种轮询场景的统一引擎
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { type PollingConfig } from "@/lib/polling/polling-config"
import {
  createPollingError,
  PollingErrorLogger,
  getRecoveryStrategy,
  PollingErrorType,
  type PollingError
} from "@/lib/polling/polling-errors"

/**
 * 通用轮询任务
 * @template TJobData - 任务特定数据类型
 */
export interface PollingJob<TJobData = any> {
  /** 唯一请求ID（来自API） */
  requestId: string
  /** 本地任务ID */
  localId: string
  /** 开始时间戳 */
  startTime: number
  /** 任务特定数据 */
  data?: TJobData
}

/**
 * 轮询状态响应
 */
export interface PollingStatusResponse {
  status: 'pending' | 'processing' | 'generating' | 'completed' | 'failed' | 'created'
  outputs?: string[]
  error?: string
  progress?: number
  [key: string]: any
}

/**
 * 数据库存储请求
 */
export interface StorageRequest<TJobData = any> {
  job: PollingJob<TJobData>
  output: string
}

/**
 * Hook 配置选项
 */
export interface UseUnifiedPollingOptions<TJobData = any> {
  /** 轮询配置 */
  config: PollingConfig

  /** 是否启用轮询 */
  enabled?: boolean

  /** 状态查询函数 */
  fetchStatus: (requestId: string, signal: AbortSignal) => Promise<PollingStatusResponse>

  /** 存储到数据库函数 */
  saveToDatabase?: (request: StorageRequest<TJobData>) => Promise<{ success: boolean; id?: string; error?: string }>

  /** 完成回调 */
  onCompleted?: (requestId: string, output: string) => void

  /** 失败回调 */
  onFailed?: (requestId: string, error: PollingError) => void

  /** 存储完成回调 */
  onStored?: (requestId: string, storedId: string) => void

  /** 进度更新回调 */
  onProgress?: (requestId: string, progress: number) => void
}

/**
 * Hook 返回值
 */
export interface UseUnifiedPollingReturn<TJobData = any> {
  /** 是否正在轮询 */
  isPolling: boolean

  /** 轮询任务数量 */
  pollingCount: number

  /** 活跃任务列表 */
  activeJobs: PollingJob<TJobData>[]

  /** 开始轮询 */
  startPolling: (requestId: string, localId: string, jobData?: TJobData) => void

  /** 停止轮询 */
  stopPolling: (requestId?: string) => void

  /** 停止所有轮询 */
  stopAllPolling: () => void
}

/**
 * 通用轮询引擎 Hook
 *
 * @example
 * ```typescript
 * const videoPolling = useUnifiedPolling({
 *   config: VIDEO_POLLING_CONFIG,
 *   fetchStatus: async (requestId, signal) => {
 *     const res = await fetch(`/api/video/status/${requestId}`, { signal })
 *     return res.json()
 *   },
 *   saveToDatabase: async ({ job, output }) => {
 *     const res = await fetch('/api/video/store', {
 *       method: 'POST',
 *       body: JSON.stringify({ requestId: job.requestId, url: output })
 *     })
 *     return res.json()
 *   },
 *   onCompleted: (requestId, url) => console.log('Completed:', url),
 *   onFailed: (requestId, error) => console.error('Failed:', error)
 * })
 * ```
 */
export function useUnifiedPolling<TJobData = any>(
  options: UseUnifiedPollingOptions<TJobData>
): UseUnifiedPollingReturn<TJobData> {
  const {
    config,
    enabled = true,
    fetchStatus,
    saveToDatabase,
    onCompleted,
    onFailed,
    onStored,
    onProgress
  } = options

  // ===== 状态管理 =====
  const [pollingJobs, setPollingJobs] = useState<Map<string, PollingJob<TJobData>>>(new Map())
  const pollingJobsRef = useRef<Map<string, PollingJob<TJobData>>>(new Map())

  // ===== 引用管理 =====
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef<Map<string, number>>(new Map())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const storageRetriesRef = useRef<Map<string, number>>(new Map())
  const storageTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const activePollingCountRef = useRef<number>(0)

  // ===== 回调引用（避免依赖循环） =====
  const callbacksRef = useRef({ onCompleted, onFailed, onStored, onProgress })
  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed, onStored, onProgress }
  }, [onCompleted, onFailed, onStored, onProgress])

  // ===== 错误日志器 =====
  const errorLogger = PollingErrorLogger.getInstance()

  /**
   * 保存到数据库（带重试）
   */
  const saveWithRetry = useCallback(async (
    job: PollingJob<TJobData>,
    output: string,
    retryCount = 0
  ) => {
    if (!saveToDatabase) {
      return
    }

    const storageKey = `storage_${job.requestId}`
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.requestTimeout || 30000
    )

    try {

      const result = await saveToDatabase({ job, output })

      clearTimeout(timeoutId)

      if (result.success && result.id) {

        // 清理重试
        storageRetriesRef.current.delete(storageKey)
        if (storageTimeoutsRef.current.has(storageKey)) {
          clearTimeout(storageTimeoutsRef.current.get(storageKey)!)
          storageTimeoutsRef.current.delete(storageKey)
        }

        // 触发回调
        callbacksRef.current.onStored?.(job.requestId, result.id)
      } else {
        throw new Error(result.error || 'Storage failed')
      }
    } catch (error) {
      clearTimeout(timeoutId)

      const pollingError = createPollingError(error as Error)
      // 只在最后一次重试失败时才报错，避免控制台噪音
      if (retryCount >= config.storageRetries) {
        console.error(`❌ Storage attempt ${retryCount + 1} failed:`, pollingError.getUserMessage())
      }

      // 重试逻辑
      if (retryCount < config.storageRetries) {
        const delay = config.storageRetryDelay * (retryCount + 1)

        // 清理旧的重试 timeout
        if (storageTimeoutsRef.current.has(storageKey)) {
          clearTimeout(storageTimeoutsRef.current.get(storageKey)!)
        }

        // 创建新的重试 timeout
        const newTimeoutId = setTimeout(() => {
          storageTimeoutsRef.current.delete(storageKey)
          saveWithRetry(job, output, retryCount + 1)
        }, delay)

        storageTimeoutsRef.current.set(storageKey, newTimeoutId)
        storageRetriesRef.current.set(storageKey, retryCount + 1)
      } else {
        console.error(`💥 All storage attempts failed for ${job.requestId}:`, pollingError.getUserMessage())
        // errorLogger.log(pollingError) // 避免输出 Object 到控制台

        // 清理
        storageRetriesRef.current.delete(storageKey)
        if (storageTimeoutsRef.current.has(storageKey)) {
          clearTimeout(storageTimeoutsRef.current.get(storageKey)!)
          storageTimeoutsRef.current.delete(storageKey)
        }
      }
    }
  }, [saveToDatabase, config.storageRetries, config.storageRetryDelay, config.requestTimeout, errorLogger])

  /**
   * 停止轮询单个任务
   */
  const stopPolling = useCallback((requestId?: string) => {
    if (requestId) {

      setPollingJobs(prev => {
        const newJobs = new Map(prev)
        newJobs.delete(requestId)
        return newJobs
      })

      errorCountRef.current.delete(requestId)

      // 取消请求
      const controller = abortControllersRef.current.get(requestId)
      if (controller) {
        controller.abort()
        abortControllersRef.current.delete(requestId)
      }

      // 清理存储重试
      const storageKey = `storage_${requestId}`
      if (storageTimeoutsRef.current.has(storageKey)) {
        clearTimeout(storageTimeoutsRef.current.get(storageKey)!)
        storageTimeoutsRef.current.delete(storageKey)
      }
      storageRetriesRef.current.delete(storageKey)

      // 减少活跃计数
      if (activePollingCountRef.current > 0) {
        activePollingCountRef.current--
      }
    } else {

      setPollingJobs(new Map())
      errorCountRef.current.clear()

      // 取消所有请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()

      // 清理所有存储重试
      storageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      storageTimeoutsRef.current.clear()
      storageRetriesRef.current.clear()

      // 重置计数
      activePollingCountRef.current = 0
    }
  }, [])

  /**
   * 开始轮询
   */
  const startPolling = useCallback((
    requestId: string,
    localId: string,
    jobData?: TJobData
  ) => {

    setPollingJobs(prev => {
      const newJobs = new Map(prev)
      newJobs.set(requestId, {
        requestId,
        localId,
        startTime: Date.now(),
        data: jobData
      })
      return newJobs
    })

    errorCountRef.current.set(requestId, 0)
    activePollingCountRef.current++
  }, [])

  /**
   * 轮询单个任务
   */
  const pollJob = useCallback(async (job: PollingJob<TJobData>) => {
    const { requestId } = job
    const now = Date.now()
    const elapsed = now - job.startTime

    // 1. 检查超时
    if (elapsed > config.maxDuration) {
      console.error(`⏰ Polling timeout for ${requestId}`)
      const timeoutError = new PollingErrorType.TASK_TIMEOUT
      const error = createPollingError(new Error('Polling timeout'))
      callbacksRef.current.onFailed?.(requestId, error)
      stopPolling(requestId)
      errorLogger.log(error)
      return
    }

    // 2. 检查并发限制
    if (config.maxConcurrentPolls && activePollingCountRef.current > config.maxConcurrentPolls) {
      return
    }

    // 3. 创建 AbortController
    const controller = new AbortController()
    abortControllersRef.current.set(requestId, controller)

    try {
      // 4. 请求状态
      const response = await fetchStatus(requestId, controller.signal)

      // 清理 controller
      abortControllersRef.current.delete(requestId)


      // 5. 处理进度
      if (response.progress !== undefined) {
        callbacksRef.current.onProgress?.(requestId, response.progress)
      }

      // 6. 处理完成

      if (response.status === 'completed' && response.outputs && response.outputs.length > 0) {
        const output = response.outputs[0]

        // 保存 job 引用（stopPolling 会删除）
        const currentJob = pollingJobsRef.current.get(requestId)

        // 立即触发完成回调
        callbacksRef.current.onCompleted?.(requestId, output)

        // 停止轮询
        stopPolling(requestId)

        // 后台存储（延迟以避免阻塞）
        if (currentJob && saveToDatabase) {
          if (config.storageStrategy === 'delayed') {
            setTimeout(() => {
              saveWithRetry(currentJob, output, 0)
            }, config.storageDelay || 100)
          } else {
            // immediate
            saveWithRetry(currentJob, output, 0)
          }
        }
      }
      // 7. 处理失败
      else if (response.status === 'failed') {
        const errorMsg = response.error || 'Task failed'
        console.error(`❌ Failed ${requestId}: ${errorMsg}`)

        const error = createPollingError(new Error(errorMsg))
        callbacksRef.current.onFailed?.(requestId, error)
        stopPolling(requestId)
        errorLogger.log(error)
      }
      // 8. 其他状态继续轮询

      // 重置错误计数
      errorCountRef.current.set(requestId, 0)

    } catch (error) {
      // 清理 controller
      abortControllersRef.current.delete(requestId)

      // 处理 abort（用户主动停止）
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      // 错误计数
      const errorCount = (errorCountRef.current.get(requestId) || 0) + 1
      errorCountRef.current.set(requestId, errorCount)

      const pollingError = createPollingError(error as Error)
      console.error(`❌ Polling error for ${requestId} (${errorCount}/${config.maxConsecutiveErrors}):`, pollingError.getUserMessage())

      errorLogger.log(pollingError)

      // 获取恢复策略
      const strategy = getRecoveryStrategy(pollingError, errorCount - 1, config.maxConsecutiveErrors)

      if (!strategy.shouldRetry || strategy.shouldStopPolling) {
        console.error(`💥 Stopping polling for ${requestId}`)
        callbacksRef.current.onFailed?.(requestId, pollingError)
        stopPolling(requestId)
      }
    }
  }, [
    config.maxDuration,
    config.maxConcurrentPolls,
    config.maxConsecutiveErrors,
    config.storageStrategy,
    config.storageDelay,
    fetchStatus,
    saveToDatabase,
    stopPolling,
    saveWithRetry,
    errorLogger
  ])

  /**
   * 批量轮询所有任务
   */
  const pollAllJobs = useCallback(() => {
    const currentJobs = pollingJobsRef.current

    if (currentJobs.size === 0) {
      return
    }


    // 并发控制: 只轮询前 N 个任务
    const maxConcurrent = config.maxConcurrentPolls || currentJobs.size
    const jobsToProcess = Array.from(currentJobs.values()).slice(0, maxConcurrent)

    jobsToProcess.forEach(job => {
      pollJob(job)
    })
  }, [pollJob, config.maxConcurrentPolls])

  /**
   * 健康检查（清理僵尸任务）
   */
  const healthCheck = useCallback(() => {
    const now = Date.now()
    const maxAge = config.maxTaskAge || config.maxDuration
    const maxGenerating = config.maxGeneratingDuration


    pollingJobsRef.current.forEach((job, requestId) => {
      const age = now - job.startTime

      // 清理超龄任务
      if (age > maxAge) {
        const error = createPollingError(new Error('Task too old'))
        callbacksRef.current.onFailed?.(requestId, error)
        stopPolling(requestId)
      }
    })
  }, [config.maxTaskAge, config.maxDuration, config.maxGeneratingDuration, stopPolling])

  // ===== 同步 state 到 ref =====
  useEffect(() => {
    pollingJobsRef.current = pollingJobs
  }, [pollingJobs])

  // ===== 轮询循环 =====
  useEffect(() => {
    if (!enabled || pollingJobs.size === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 避免重复创建 interval
    if (intervalRef.current) {
      return
    }


    // 立即轮询一次
    pollAllJobs()

    // 设置定时轮询
    intervalRef.current = setInterval(pollAllJobs, config.interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, pollingJobs.size, config.interval, pollAllJobs])

  // ===== 健康检查循环 =====
  useEffect(() => {
    if (!enabled || !config.healthCheckInterval || pollingJobs.size === 0) {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
      return
    }

    // 避免重复创建
    if (healthCheckIntervalRef.current) {
      return
    }


    healthCheckIntervalRef.current = setInterval(healthCheck, config.healthCheckInterval)

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
    }
  }, [enabled, config.healthCheckInterval, pollingJobs.size, healthCheck])

  // ===== 组件卸载清理 =====
  useEffect(() => {
    return () => {
      // 清理轮询
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }

      // 取消所有请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()

      // 清理存储重试
      storageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      storageTimeoutsRef.current.clear()
    }
  }, [])

  return {
    isPolling: pollingJobs.size > 0,
    pollingCount: pollingJobs.size,
    activeJobs: Array.from(pollingJobs.values()),
    startPolling,
    stopPolling,
    stopAllPolling: () => stopPolling()
  }
}

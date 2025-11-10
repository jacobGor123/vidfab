/**
 * Image Polling Hook
 * 管理图片生成状态轮询逻辑（增强版，包含数据库存储）
 * 参考: /hooks/use-video-polling.ts
 */

import { useState, useEffect, useRef, useCallback } from "react"

interface PollingJob {
  requestId: string
  localId: string
  startTime: number
  userId?: string
  userEmail?: string
  prompt?: string
  settings?: any
}

interface UseImagePollingOptions {
  enabled?: boolean
  interval?: number
  maxDuration?: number
  userId?: string
  userEmail?: string
  onCompleted?: (requestId: string, imageUrl: string) => void
  onFailed?: (requestId: string, error: string) => void
  onStored?: (requestId: string, imageId: string) => void
}

interface UseImagePollingReturn {
  isPolling: boolean
  pollingCount: number
  startPolling: (requestId: string, localId: string, jobData?: {
    userId?: string
    userEmail?: string
    prompt?: string
    settings?: any
  }) => void
  stopPolling: (requestId?: string) => void
}

const DEFAULT_POLLING_INTERVAL = 2000 // 2 seconds
const MAX_POLLING_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CONSECUTIVE_ERRORS = 3
const MAX_STORAGE_RETRIES = 3 // 最大存储重试次数
const STORAGE_RETRY_DELAY = 2000 // 存储重试延迟（毫秒）

export function useImagePolling(
  options: UseImagePollingOptions = {}
): UseImagePollingReturn {
  const {
    enabled = true,
    interval = DEFAULT_POLLING_INTERVAL,
    maxDuration = MAX_POLLING_DURATION,
    userId,
    userEmail,
    onCompleted,
    onFailed,
    onStored
  } = options

  const [pollingJobs, setPollingJobs] = useState<Map<string, PollingJob>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef<Map<string, number>>(new Map())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pollingJobsRef = useRef<Map<string, PollingJob>>(new Map()) // 🔥 用于追踪最新状态

  // 🔥 使用 ref 存储回调，避免依赖变化导致 pollJob 重建
  const callbacksRef = useRef({ onCompleted, onFailed, onStored })
  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed, onStored }
  }, [onCompleted, onFailed, onStored])

  // 🔥 使用 ref 存储 saveImageToDatabase 函数
  const saveImageToDatabaseRef = useRef<typeof saveImageToDatabase>()

  /**
   * 保存图片到数据库（包含重试机制）
   */
  const saveImageToDatabase = useCallback(async (
    job: PollingJob,
    imageUrl: string,
    retryCount = 0
  ) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

    try {
      console.log(`💾 Saving image to database (attempt ${retryCount + 1}/${MAX_STORAGE_RETRIES + 1})`)

      const response = await fetch('/api/image/store', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: job.userId || userId,
          userEmail: job.userEmail || userEmail || 'unknown@vidfab.ai',
          wavespeedRequestId: job.requestId,
          originalUrl: imageUrl,
          settings: {
            ...job.settings,
            prompt: job.prompt
          }
        })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data.imageId) {
        console.log(`✅ Image stored successfully: ${data.data.imageId}`)

        // 清理重试 timeout
        const retryKey = `storage_${job.requestId}`
        if (retryTimeoutsRef.current.has(retryKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryKey)!)
          retryTimeoutsRef.current.delete(retryKey)
        }

        // 触发存储完成回调
        callbacksRef.current.onStored?.(job.requestId, data.data.imageId)
      } else {
        throw new Error(data.error || 'Storage API returned success=false')
      }
    } catch (error) {
      clearTimeout(timeoutId)

      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Storage request timed out'
        : (error instanceof Error ? error.message : 'Unknown error')

      console.error(`❌ Image storage attempt ${retryCount + 1} failed:`, errorMessage)

      // 重试逻辑
      if (retryCount < MAX_STORAGE_RETRIES) {
        const retryKey = `storage_${job.requestId}`

        // 清理旧的重试 timeout
        if (retryTimeoutsRef.current.has(retryKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryKey)!)
        }

        // 创建新的重试 timeout
        const newTimeoutId = setTimeout(() => {
          retryTimeoutsRef.current.delete(retryKey)
          saveImageToDatabase(job, imageUrl, retryCount + 1)
        }, STORAGE_RETRY_DELAY * (retryCount + 1)) // 递增延迟

        retryTimeoutsRef.current.set(retryKey, newTimeoutId)
      } else {
        console.error(`💥 All storage attempts failed for image ${job.requestId}. Image will remain in temporary storage.`)

        // 清理重试 timeout
        const retryKey = `storage_${job.requestId}`
        if (retryTimeoutsRef.current.has(retryKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryKey)!)
          retryTimeoutsRef.current.delete(retryKey)
        }
      }
    }
  }, [userId, userEmail]) // 🔥 移除 onStored 依赖,改用 callbacksRef

  // 🔥 同步 saveImageToDatabase 到 ref
  useEffect(() => {
    saveImageToDatabaseRef.current = saveImageToDatabase
  }, [saveImageToDatabase])

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
    console.log(`🔄 Starting polling for image ${requestId}`)
    setPollingJobs(prev => {
      const newJobs = new Map(prev)
      newJobs.set(requestId, {
        requestId,
        localId,
        startTime: Date.now(),
        userId: jobData?.userId,
        userEmail: jobData?.userEmail,
        prompt: jobData?.prompt,
        settings: jobData?.settings
      })
      return newJobs
    })
    errorCountRef.current.set(requestId, 0)
  }, [])

  /**
   * 停止轮询
   */
  const stopPolling = useCallback((requestId?: string) => {
    if (requestId) {
      console.log(`⏸️ Stopping polling for image ${requestId}`)
      setPollingJobs(prev => {
        const newJobs = new Map(prev)
        newJobs.delete(requestId)
        return newJobs
      })
      errorCountRef.current.delete(requestId)

      // 取消进行中的请求
      const controller = abortControllersRef.current.get(requestId)
      if (controller) {
        controller.abort()
        abortControllersRef.current.delete(requestId)
      }

      // 清理重试 timeout
      const retryKey = `storage_${requestId}`
      if (retryTimeoutsRef.current.has(retryKey)) {
        clearTimeout(retryTimeoutsRef.current.get(retryKey)!)
        retryTimeoutsRef.current.delete(retryKey)
      }
    } else {
      console.log(`⏸️ Stopping all image polling`)
      setPollingJobs(new Map())
      errorCountRef.current.clear()

      // 取消所有进行中的请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()

      // 清理所有重试 timeout
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      retryTimeoutsRef.current.clear()
    }
  }, [])

  /**
   * 轮询单个任务
   */
  const pollJob = useCallback(async (job: PollingJob, allJobs: Map<string, PollingJob>) => {
    const { requestId } = job
    const now = Date.now()
    const elapsed = now - job.startTime

    // 检查是否超时
    if (elapsed > maxDuration) {
      console.error(`⏰ Image polling timeout for ${requestId}`)
      callbacksRef.current.onFailed?.(requestId, 'Image generation timeout')
      stopPolling(requestId)
      return
    }

    // 创建 AbortController
    const controller = new AbortController()
    abortControllersRef.current.set(requestId, controller)

    try {
      const response = await fetch(`/api/image/status/${requestId}`, {
        signal: controller.signal
      })

      // 清理 AbortController
      abortControllersRef.current.delete(requestId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const status = data.data.status

      console.log(`📊 Image ${requestId} status: ${status}`)

      if (status === 'completed' && data.data.outputs && data.data.outputs.length > 0) {
        const imageUrl = data.data.outputs[0]
        console.log(`✅ Image ${requestId} completed: ${imageUrl}`)

        // 🔥 CRITICAL: 先保存 job 引用，再停止轮询（stopPolling 会删除 job）
        const pollingJob = allJobs.get(requestId)

        // 1. 立即触发完成回调，让前端显示图片
        callbacksRef.current.onCompleted?.(requestId, imageUrl)

        // 2. 停止轮询
        stopPolling(requestId)

        // 3. 🔥 后台保存到数据库（使用 setTimeout 确保不阻塞）
        if (pollingJob && saveImageToDatabaseRef.current) {
          // 延迟 100ms 后再保存，确保前端已经更新
          setTimeout(() => {
            saveImageToDatabaseRef.current?.(pollingJob, imageUrl).catch(err => {
              console.error(`💥 Failed to save image to database:`, err)
              // 不影响用户体验，只记录错误
            })
          }, 100)
        } else {
          if (!pollingJob) {
            console.error(`❌ pollingJob not found for ${requestId}, skipping database storage`)
          }
          if (!saveImageToDatabaseRef.current) {
            console.error(`❌ saveImageToDatabase function not ready`)
          }
        }
      } else if (status === 'failed') {
        const error = data.data.error || 'Image generation failed'
        console.error(`❌ Image ${requestId} failed: ${error}`)
        callbacksRef.current.onFailed?.(requestId, error)
        stopPolling(requestId)
      }
      // 如果是 'processing' 或 'created'，继续轮询

      // 重置错误计数
      errorCountRef.current.set(requestId, 0)

    } catch (error) {
      // 清理 AbortController
      abortControllersRef.current.delete(requestId)

      // 处理 abort 错误（用户主动停止）
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`🛑 Image polling aborted for ${requestId}`)
        return
      }

      // 错误计数
      const errorCount = (errorCountRef.current.get(requestId) || 0) + 1
      errorCountRef.current.set(requestId, errorCount)

      console.error(`❌ Image polling error for ${requestId} (${errorCount}/${MAX_CONSECUTIVE_ERRORS}):`, error)

      // 达到最大错误次数，停止轮询
      if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`💥 Max errors reached for ${requestId}, stopping polling`)
        callbacksRef.current.onFailed?.(requestId, 'Too many polling errors')
        stopPolling(requestId)
      }
    }
  }, [maxDuration, stopPolling]) // 🔥 移除 saveImageToDatabase 依赖,改用 ref

  // 🔥 同步 pollingJobs 到 ref，确保 setInterval 中始终使用最新值
  useEffect(() => {
    pollingJobsRef.current = pollingJobs
  }, [pollingJobs])

  /**
   * 轮询循环
   */
  useEffect(() => {
    if (!enabled || pollingJobs.size === 0) {
      if (intervalRef.current) {
        console.log('🛑 Clearing interval - no jobs')
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 🔥 如果已经有 interval 在运行，不要重新创建！
    if (intervalRef.current) {
      console.log('⚠️ Interval already running, not recreating')
      return
    }

    console.log(`🔄 Starting polling interval for ${pollingJobs.size} jobs`)

    // 立即轮询一次
    pollingJobs.forEach(job => {
      console.log(`📡 Initial poll for job ${job.requestId}`)
      pollJob(job, pollingJobs)
    })

    // 设置定时轮询 - 使用 ref 获取最新的 pollingJobs
    intervalRef.current = setInterval(() => {
      const currentJobs = pollingJobsRef.current
      console.log(`⏰ Polling ${currentJobs.size} jobs...`)
      currentJobs.forEach(job => pollJob(job, currentJobs))
    }, interval)

    return () => {
      if (intervalRef.current) {
        console.log('🧹 Cleanup: clearing interval')
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, pollingJobs.size, interval, pollJob])

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // 取消所有进行中的请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()

      // 清理所有重试 timeout
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      retryTimeoutsRef.current.clear()
    }
  }, [])

  return {
    isPolling: pollingJobs.size > 0,
    pollingCount: pollingJobs.size,
    startPolling,
    stopPolling
  }
}

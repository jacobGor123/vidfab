"use client"

/**
 * Video Polling Hook V2
 * 基于统一轮询引擎的新版视频轮询 Hook
 *
 * 迁移指南:
 * - 旧版本: /hooks/use-video-polling.ts (已重命名为 use-video-polling.legacy.ts)
 * - 新版本: /hooks/use-video-polling-v2.ts (本文件)
 *
 * 主要改进:
 * 1. 基于 useUnifiedPolling 统一引擎
 * 2. 更清晰的职责分离
 * 3. 更好的错误处理
 * 4. 自动健康检查
 * 5. 智能存储重试
 */

import { useCallback, useMemo } from "react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { VideoJob } from "@/lib/types/video"
import { VIDEO_POLLING_CONFIG, type PollingConfig } from "@/lib/polling/polling-config"
import { useUnifiedPolling, type PollingStatusResponse } from "./use-unified-polling"
import { createPollingError, type PollingError } from "@/lib/polling/polling-errors"
import { GenerationAnalytics, type GenerationType } from "@/lib/analytics/generation-events"
import { emitCreditsUpdated } from "@/lib/events/credits-events"

/**
 * 视频任务数据
 */
interface VideoJobData {
  userId?: string
  userEmail?: string
  prompt?: string
  sourceImage?: string
  effectId?: string
  effectName?: string
  generationType?: string
  settings?: any
}

/**
 * Hook 配置选项
 */
interface UseVideoPollingV2Options {
  /** 是否启用轮询 */
  enabled?: boolean

  /** 自定义配置 */
  config?: Partial<PollingConfig>

  /** 轮询间隔(优先级高于config) */
  interval?: number

  /** 完成回调 */
  onCompleted?: (job: VideoJob, resultUrl: string) => void

  /** 失败回调 */
  onFailed?: (job: VideoJob, error: string) => void

  /** 进度回调 */
  onProgress?: (job: VideoJob, progress: number) => void
}

/**
 * Hook 返回值
 */
interface UseVideoPollingV2Return {
  /** 是否正在轮询 */
  isPolling: boolean

  /** 轮询任务列表 */
  pollingJobs: VideoJob[]

  /** 轮询任务数量 */
  pollingCount: number

  /** 开始轮询 */
  startPolling: (job: VideoJob) => void

  /** 停止轮询 */
  stopPolling: (jobId?: string) => void

  /** 停止所有轮询 */
  stopAllPolling: () => void

  /** 重启轮询(清理后重新开始) */
  restartPolling: () => void
}

/**
 * 视频轮询 Hook V2
 *
 * @example
 * ```tsx
 * const videoPolling = useVideoPollingV2({
 *   onCompleted: (job, url) => {
 *     console.log('Video completed:', url)
 *   },
 *   onFailed: (job, error) => {
 *     console.error('Video failed:', error)
 *   }
 * })
 *
 * // 开始轮询 - 传入完整的 VideoJob 对象
 * videoPolling.startPolling(job)
 *
 * // 停止轮询
 * videoPolling.stopPolling(job.id)
 * ```
 */
export function useVideoPollingV2(
  options: UseVideoPollingV2Options = {}
): UseVideoPollingV2Return {
  const {
    enabled = true,
    config: customConfig,
    interval: customInterval,
    onCompleted,
    onFailed,
    onProgress
  } = options

  const videoContext = useVideoContext()

  // 合并配置
  const pollingConfig = useMemo((): PollingConfig => ({
    ...VIDEO_POLLING_CONFIG,
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
    const response = await fetch(`/api/video/status/${requestId}`, {
      method: 'GET',
      signal,
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // 🔥 修复：API返回的是resultUrl，不是outputs数组
    // 需要转换为统一轮询引擎期望的格式
    // ⚠️ 重要：只有当 resultUrl 存在时才返回数组，否则返回 undefined
    const outputs = data.data.resultUrl ? [data.data.resultUrl] : undefined

    return {
      status: data.data.status,
      outputs: outputs,
      error: data.data.error,
      progress: data.data.progress
    }
  }, [])

  /**
   * 数据库存储函数
   */
  const saveToDatabase = useCallback(async ({ job, output }: {
    job: { requestId: string; localId: string; data?: VideoJobData }
    output: string
  }) => {
    const jobData = job.data || {}

    const response = await fetch('/api/video/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: jobData.userId,
        userEmail: jobData.userEmail || 'unknown@vidfab.ai',
        wavespeedRequestId: job.requestId,
        originalUrl: output,
        settings: {
          ...jobData.settings,
          prompt: jobData.prompt,
          image_url: jobData.sourceImage || jobData.settings?.image_url || null,
          effectId: jobData.effectId || jobData.settings?.effectId || null,
          effectName: jobData.effectName || jobData.settings?.effectName || null,
          generationType: jobData.generationType || jobData.settings?.generationType || null
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success || !data.data.videoId) {
      throw new Error(data.error || 'Storage failed')
    }

    return {
      success: true,
      id: data.data.videoId
    }
  }, [])

  /**
   * 完成回调处理
   */
  const handleCompleted = useCallback((requestId: string, output: string) => {
    // 通过 requestId 找到对应的 VideoJob
    const job = videoContext.activeJobs.find(j => j.requestId === requestId)

    if (!job) {
      return
    }

    // 🔥 事件: 生成成功 (只在任务还在处理状态时触发,避免重复)
    if (job.status === 'processing' || job.status === 'queued') {
      GenerationAnalytics.trackGenerationSuccess({
        generationType: (job.generationType || job.settings?.generationType || 'text-to-video') as GenerationType,
        jobId: job.id,
        requestId: job.requestId,
        modelType: job.settings?.model,
      })
    }

    // 构造 VideoResult 对象
    const videoResult = {
      videoUrl: output,
      prompt: job.prompt || '',
      settings: job.settings || {},
      createdAt: new Date().toISOString(),
      userId: job.userId || '',
      isStored: false // 初始为 false，存储完成后会更新
    }

    // 更新 context
    videoContext.completeJob(job.id, videoResult)

    // 🔥 触发积分更新事件
    emitCreditsUpdated('video-completed')

    // 触发用户回调
    onCompleted?.(job, output)
  }, [videoContext, onCompleted])

  /**
   * 失败回调处理
   */
  const handleFailed = useCallback((requestId: string, error: PollingError) => {
    // 通过 requestId 找到对应的 VideoJob
    const job = videoContext.activeJobs.find(j => j.requestId === requestId)

    if (!job) {
      return
    }

    console.error(`❌ Video ${job.id} failed:`, error.getUserMessage())

    // 🔥 事件: 生成失败
    GenerationAnalytics.trackGenerationFailed({
      generationType: (job.generationType || job.settings?.generationType || 'text-to-video') as GenerationType,
      jobId: job.id,
      requestId: job.requestId,
      errorType: error.code,
      errorMessage: error.getUserMessage(),
      modelType: job.settings?.model,
    })

    // 更新 context
    videoContext.failJob(job.id, error.getUserMessage())

    // 触发用户回调
    onFailed?.(job, error.getUserMessage())
  }, [videoContext, onFailed])

  /**
   * 存储完成回调
   */
  const handleStored = useCallback(async (requestId: string, videoId: string) => {

    // 调用 context 的存储完成处理
    try {
      await videoContext.handleVideoStorageCompleted?.(videoId)
    } catch (error) {
    }
  }, [videoContext])

  /**
   * 进度回调处理
   */
  const handleProgress = useCallback((requestId: string, progress: number) => {
    // 通过 requestId 找到对应的 VideoJob
    const job = videoContext.activeJobs.find(j => j.requestId === requestId)

    if (!job) {
      return
    }


    // 触发用户回调
    onProgress?.(job, progress)
  }, [videoContext, onProgress])

  // 使用统一轮询引擎
  const unifiedPolling = useUnifiedPolling<VideoJobData>({
    config: pollingConfig,
    enabled,
    fetchStatus,
    saveToDatabase,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onStored: handleStored,
    onProgress: handleProgress
  })

  /**
   * 开始轮询
   *
   * 🎯 直接接受 VideoJob 对象，避免 React 状态同步和查找失败问题
   */
  const startPolling = useCallback((job: VideoJob) => {
    // 🔥 增强验证：确保 job 对象完整有效
    if (!job || !job.id) {
      console.error(`❌ [V2] Invalid job object:`, job)
      return
    }

    if (!job.requestId) {
      console.error(`❌ [V2] Critical: Job ${job.id} missing requestId!`)
      console.error(`Job details:`, JSON.stringify(job, null, 2))

      // 🔥 不要直接返回，尝试延迟重试（给React状态更新一些时间）
      console.log(`⏳ [V2] Scheduling retry in 500ms...`)
      setTimeout(() => {
        const updatedJob = videoContext.activeJobs.find(j => j.id === job.id)
        if (updatedJob && updatedJob.requestId) {
          console.log(`✅ [V2] Retry successful: Job ${job.id} now has requestId ${updatedJob.requestId}`)
          startPolling(updatedJob)
        } else {
          console.error(`❌ [V2] Retry failed: Job ${job.id} still missing requestId after 500ms`)
          console.error(`Updated job from context:`, updatedJob)
        }
      }, 500)
      return
    }

    // 准备任务数据
    const jobData: VideoJobData = {
      userId: job.userId,
      userEmail: job.userEmail,
      prompt: job.prompt,
      sourceImage: job.sourceImage,
      effectId: job.effectId,
      effectName: job.effectName,
      generationType: job.generationType,
      settings: job.settings
    }

    console.log(`🚀 [V2] Starting polling for job ${job.id} with requestId ${job.requestId}`)
    unifiedPolling.startPolling(job.requestId, job.id, jobData)

    // 🔥 生成开始时立即刷新积分 (因为API在开始时就扣除了积分)
    emitCreditsUpdated('video-started')
  }, [unifiedPolling, videoContext.activeJobs])

  /**
   * 停止轮询
   */
  const stopPolling = useCallback((jobId?: string) => {
    if (jobId) {
      const job = videoContext.activeJobs.find(j => j.id === jobId)
      if (job && job.requestId) {
        unifiedPolling.stopPolling(job.requestId)
      }
    } else {
      unifiedPolling.stopAllPolling()
    }
  }, [videoContext.activeJobs, unifiedPolling])

  /**
   * 重启轮询
   */
  const restartPolling = useCallback(() => {
    unifiedPolling.stopAllPolling()

    // 重新启动所有应该轮询的任务
    videoContext.activeJobs.forEach(job => {
      // 🔥 增强验证：确保 job 对象完整有效
      if (
        job &&
        job.id &&
        job.requestId &&
        (job.status === 'processing' || job.status === 'queued' || job.status === 'created')
      ) {
        startPolling(job)
      }
    })
  }, [videoContext.activeJobs, unifiedPolling, startPolling])

  /**
   * 获取正在轮询的任务列表
   */
  const pollingJobs = useMemo(() => {
    const activeRequestIds = new Set(
      unifiedPolling.activeJobs.map(j => j.requestId)
    )

    return videoContext.activeJobs.filter(job =>
      job.requestId && activeRequestIds.has(job.requestId)
    )
  }, [unifiedPolling.activeJobs, videoContext.activeJobs])

  return {
    isPolling: unifiedPolling.isPolling,
    pollingJobs,
    pollingCount: unifiedPolling.pollingCount,
    startPolling,
    stopPolling,
    stopAllPolling: unifiedPolling.stopAllPolling,
    restartPolling
  }
}

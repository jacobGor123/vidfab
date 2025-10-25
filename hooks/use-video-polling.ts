"use client"

/**
 * Video Polling Hook
 * 管理视频生成状态轮询逻辑
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { VideoJob } from "@/lib/types/video"
import { videoApiClient } from "@/lib/api/resilient-client"
import { retryWithBackoff, ErrorReporter } from "@/lib/utils/error-handling"

interface UseVideoPollingOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onCompleted?: (job: VideoJob, resultUrl: string) => void
  onFailed?: (job: VideoJob, error: string) => void
  onProgress?: (job: VideoJob, progress: number) => void
}

interface UseVideoPollingReturn {
  isPolling: boolean
  pollingJobs: VideoJob[]
  isStoragePolling: boolean
  storagePollingCount: number
  startPolling: (jobId: string) => void
  stopPolling: (jobId?: string) => void
  stopStoragePolling: (videoId?: string) => void
  restartPolling: () => void
}

const DEFAULT_POLLING_INTERVAL = 3000 // 3 seconds
const MAX_POLLING_DURATION = 30 * 60 * 1000 // 30 minutes
const MAX_CONSECUTIVE_ERRORS = 5
const MAX_STORAGE_RETRIES = 3 // 最大存储重试次数
const STORAGE_RETRY_DELAY = 2000 // 存储重试延迟（毫秒）
const MAX_CONCURRENT_POLLS = 3 // 🔥 限制最大并发轮询数量,防止资源耗尽
const MAX_GENERATING_DURATION = 5 * 60 * 1000 // 🔥 最大任务创建等待时间(5分钟)
const HEALTH_CHECK_INTERVAL = 30000 // 🔥 健康检查间隔(30秒)

export function useVideoPolling(
  options: UseVideoPollingOptions = {}
): UseVideoPollingReturn {
  const {
    enabled = true,
    interval = DEFAULT_POLLING_INTERVAL,
    onCompleted,
    onFailed,
    onProgress
  } = options

  const videoContext = useVideoContext()
  const [pollingJobIds, setPollingJobIds] = useState<Set<string>>(new Set())
  const [storagePollingIds, setStoragePollingIds] = useState<Set<string>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const storageIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef<Map<string, number>>(new Map())
  const startTimeRef = useRef<Map<string, number>>(new Map())

  // 🔥 修复1: 追踪所有重试 timeout,避免内存泄漏
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 🔥 修复2: 追踪所有进行中的 fetch AbortController,避免竞态条件
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // 使用 ref 立即同步追踪应该停止轮询的任务，避免异步状态更新导致的时序问题
  const stoppedJobIdsRef = useRef<Set<string>>(new Set())

  // 🔥 清理无效任务的函数,防止僵尸轮询
  const cleanInvalidJobs = useCallback(() => {
    const now = Date.now()

    videoContext.activeJobs.forEach(job => {
      // 检查1: 任务状态为 'generating' 超过5分钟 → 标记为失败
      // 这通常意味着任务创建过程中出现了问题(API超时、网络中断等)
      if (job.status === 'generating') {
        const taskAge = now - new Date(job.createdAt).getTime()
        if (taskAge > MAX_GENERATING_DURATION) {
          console.warn(`🧹 清理超时的 generating 任务: ${job.id} (${Math.floor(taskAge / 1000)}秒)`)
          videoContext.failJob(job.id, "Task creation timeout - please try again")
          return
        }
      }

      // 检查2: 任务状态为 'processing'/'queued'/'created' 但无 requestId → 标记为失败
      // 这是不合法的状态,任务不可能在没有 requestId 的情况下进入这些状态
      if ((job.status === 'processing' || job.status === 'queued' || job.status === 'created') && !job.requestId) {
        console.warn(`🧹 清理无 requestId 的任务: ${job.id}, status: ${job.status}`)
        videoContext.failJob(job.id, "Invalid task state - missing request ID")
        return
      }

      // 检查3: 任务在 pollingJobIds 中,但已经 completed/failed → 清理轮询
      if ((job.status === 'completed' || job.status === 'failed') && pollingJobIds.has(job.id)) {
        console.warn(`🧹 清理已完成但仍在轮询的任务: ${job.id}`)
        stoppedJobIdsRef.current.add(job.id)
        setPollingJobIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(job.id)
          return newSet
        })
      }
    })
  }, [videoContext, pollingJobIds])

  // 🔥 改进的数据库保存函数，包含重试机制和超时控制
  const saveVideoToDatabase = useCallback(async (job: VideoJob, resultUrl: string, retryCount = 0) => {
    // 🔥 修复4: 添加超时控制，防止请求永久挂起
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

    try {
      const response = await fetch('/api/video/store', {
        method: 'POST',
        signal: controller.signal, // 🔥 添加 abort signal
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: job.userId,
          userEmail: job.userEmail || 'unknown@vidfab.ai',
          wavespeedRequestId: job.requestId,
          originalUrl: resultUrl,
          settings: {
            ...job.settings,
            prompt: job.prompt,
            // 🔥 传递图片 URL（如果是 image-to-video）
            image_url: job.sourceImage || job.settings.image_url || job.settings.image || null,
            // 🔥 传递特效信息（如果是 video-effects）
            effectId: job.effectId || job.settings.effectId || null,
            effectName: job.effectName || job.settings.effectName || null,
            // 🔥 传递生成类型
            generationType: job.generationType || job.settings.generationType || null
          }
        })
      })

      // 请求成功，清理超时
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data.videoId) {
        // 🔥 清理成功任务的重试 timeout (如果有)
        const retryTimeoutKey = `storage_${job.id}`
        if (retryTimeoutsRef.current.has(retryTimeoutKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryTimeoutKey)!)
          retryTimeoutsRef.current.delete(retryTimeoutKey)
        }

        // 🔥 存储成功时，安全调用处理方法
        try {
          await videoContext.handleVideoStorageCompleted?.(data.data.videoId)
        } catch (storageError) {
          console.warn('handleVideoStorageCompleted failed but video is stored:', storageError)
        }
      } else {
        throw new Error(data.error || 'Storage API returned success=false')
      }
    } catch (error) {
      // 清理超时定时器
      clearTimeout(timeoutId)

      // 处理 abort 错误
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Storage request timed out'
        : (error instanceof Error ? error.message : 'Unknown error')

      console.error(`❌ Video storage attempt ${retryCount + 1} failed:`, errorMessage)

      // 🔥 修复1: 如果还有重试次数，使用可追踪的 timeout
      if (retryCount < MAX_STORAGE_RETRIES) {
        const retryTimeoutKey = `storage_${job.id}`

        // 清理旧的重试 timeout (如果存在)
        if (retryTimeoutsRef.current.has(retryTimeoutKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryTimeoutKey)!)
        }

        // 创建新的重试 timeout 并追踪
        const newTimeoutId = setTimeout(() => {
          retryTimeoutsRef.current.delete(retryTimeoutKey)
          saveVideoToDatabase(job, resultUrl, retryCount + 1)
        }, STORAGE_RETRY_DELAY * (retryCount + 1)) // 递增延迟

        retryTimeoutsRef.current.set(retryTimeoutKey, newTimeoutId)
      } else {
        console.error(`💥 All storage attempts failed for video ${job.id}. Video will remain in temporary storage.`)
        // 🔥 清理最后的重试 timeout
        const retryTimeoutKey = `storage_${job.id}`
        if (retryTimeoutsRef.current.has(retryTimeoutKey)) {
          clearTimeout(retryTimeoutsRef.current.get(retryTimeoutKey)!)
          retryTimeoutsRef.current.delete(retryTimeoutKey)
        }
      }
    }
  }, [videoContext])

  // Get current polling jobs - include all statuses that might need polling
  const pollingJobs = videoContext.activeJobs.filter(job =>
    pollingJobIds.has(job.id) &&
    (job.status === "processing" || job.status === "queued" || job.status === "created")
  )

  const isPolling = pollingJobIds.size > 0
  const isStoragePolling = storagePollingIds.size > 0
  const storagePollingCount = storagePollingIds.size

  // 轮询单个任务状态
  const pollJobStatus = useCallback(async (job: VideoJob) => {
    const jobId = job.id

    // 立即检查任务是否已被标记停止，避免重复处理
    if (stoppedJobIdsRef.current.has(jobId)) {
      return
    }

    if (!job.requestId) {
      console.warn(`Job ${jobId} has no requestId, stopping polling`)
      stoppedJobIdsRef.current.add(jobId) // 立即标记停止
      setPollingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
      return
    }

    // 🔥 修复2: 为每个轮询请求创建 AbortController,支持取消
    const controller = new AbortController()
    abortControllersRef.current.set(jobId, controller)

    // 🔥 添加请求超时控制(30秒)
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 30000)

    try {
      // 在异步操作前再次检查
      if (stoppedJobIdsRef.current.has(jobId)) {
        clearTimeout(timeoutId)
        abortControllersRef.current.delete(jobId)
        return
      }

      // 🔥 简化状态检查：直接使用fetch，跳过复杂的API client
      const response = await fetch(`/api/video/status/${job.requestId}`, {
        method: 'GET',
        signal: controller.signal, // 🔥 添加 abort signal
        headers: { 'Content-Type': 'application/json' }
      })

      // 🔥 清理超时定时器
      clearTimeout(timeoutId)

      // 请求完成后再次检查是否已停止
      if (stoppedJobIdsRef.current.has(jobId)) {
        abortControllersRef.current.delete(jobId)
        return
      }

      if (!response.ok) {
        if (response.status === 404) {
          // 任务不存在或已过期
          console.warn(`Task ${job.requestId} not found, marking as failed`)
          videoContext.failJob(jobId, "Task expired or not found")
          stoppedJobIdsRef.current.add(jobId) // 立即标记停止
          setPollingJobIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
          abortControllersRef.current.delete(jobId) // 清理 controller
          return
        }

        throw new Error(`HTTP ${response.status}`)
      }

      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'API Error')
      }

      // 🔥 处理响应前最后一次检查
      if (stoppedJobIdsRef.current.has(jobId)) {
        abortControllersRef.current.delete(jobId)
        return
      }

      const { status, progress, resultUrl, error } = responseData.data

      // 重置错误计数
      errorCountRef.current.delete(jobId)

      switch (status) {
        case "completed":
          if (resultUrl) {
            // 🔥 1. 简化积分处理 - 直接触发积分刷新（因为我们使用即时扣除模式）
            // 触发前端积分刷新（通过广播事件）
            window.dispatchEvent(new CustomEvent('credits-updated', {
              detail: {
                videoCompleted: true,
                jobId: jobId
              }
            }))

            // 🔥 2. 关键修复：先更新状态，再停止轮询
            const updateData = {
              status: 'completed' as const,
              progress: 100,
              resultUrl: resultUrl
            }
            videoContext.updateJob(jobId, updateData)

            // 3. 触发完成回调，确保前端更新
            onCompleted?.(job, resultUrl)

            // 4. 然后停止轮询
            stoppedJobIdsRef.current.add(jobId)
            setPollingJobIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(jobId)
              return newSet
            })
            abortControllersRef.current.delete(jobId) // 🔥 清理 controller

            // 5. 🔥 立即将视频添加到completedVideos供用户预览，标记为临时存储
            videoContext.completeJob(jobId, {
              videoUrl: resultUrl,
              prompt: job.prompt,
              settings: job.settings,
              createdAt: new Date().toISOString(),
              userId: job.userId,
              isStored: false // 初始标记为未存储，等待数据库存储完成
            })

            // 6. 🔥 改进的数据库保存流程，包含重试机制
            saveVideoToDatabase(job, resultUrl)
          } else {
            // 完成但没有结果URL，标记为失败
            console.warn(`⚠️ Video generation completed but no result URL: ${jobId}`)
            videoContext.failJob(jobId, "Video generation completed but no result URL returned")
            onFailed?.(job, "Video generation completed but no result URL returned")
            abortControllersRef.current.delete(jobId) // 🔥 清理 controller
          }
          break

        case "failed":
          // 🔥 1. 先释放预扣的积分
          if (job.reservationId) {
            try {
              // 🔥 修复：添加超时控制
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

              const releaseResponse = await fetch('/api/subscription/credits/release', {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reservation_id: job.reservationId
                })
              })

              clearTimeout(timeoutId)

              if (releaseResponse.ok) {
                const releaseData = await releaseResponse.json()

                // 🔥 触发前端积分刷新
                window.dispatchEvent(new CustomEvent('credits-updated', {
                  detail: {
                    creditsRemaining: releaseData.credits_remaining,
                    creditsReleased: releaseData.credits_released
                  }
                }))
              } else {
                console.error('❌ 积分释放失败:', await releaseResponse.text())
              }
            } catch (releaseError) {
              if ((releaseError as Error).name === 'AbortError') {
                console.warn('⏱️ 积分释放请求超时')
              } else {
                console.error('❌ 积分释放API调用失败:', releaseError)
              }
            }
          } else {
            console.warn('⚠️ 视频失败但缺少 reservationId，无法释放积分')
          }

          // 🔥 2. 任务失败处理
          const failureReason = error || "Video generation failed"
          videoContext.failJob(jobId, failureReason)
          onFailed?.(job, failureReason)

          // 停止轮询此任务
          stoppedJobIdsRef.current.add(jobId) // 立即标记停止
          setPollingJobIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
          abortControllersRef.current.delete(jobId) // 🔥 清理 controller

          console.error(`❌ 任务失败: ${jobId} - ${failureReason}`)
          break

        case "processing":
        case "queued":
        case "created":
          // 更新进度
          if (progress !== undefined && progress !== job.progress) {
            videoContext.updateJob(jobId, { progress })
            onProgress?.(job, progress)
          }

          // 检查是否超过最大轮询时间
          const startTime = startTimeRef.current.get(jobId) || Date.now()
          if (Date.now() - startTime > MAX_POLLING_DURATION) {
            console.warn(`任务 ${jobId} 轮询超时，停止轮询`)
            videoContext.failJob(jobId, "Task timeout")
            onFailed?.(job, "Task timeout")
            stoppedJobIdsRef.current.add(jobId) // 立即标记停止
            setPollingJobIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(jobId)
              return newSet
            })
            abortControllersRef.current.delete(jobId) // 🔥 清理 controller
          }
          // 🔥 正常进行中的任务，清理 controller 等待下次轮询
          abortControllersRef.current.delete(jobId)
          break

        default:
          console.warn(`Unknown status for job ${jobId}: ${status}`)
          abortControllersRef.current.delete(jobId) // 🔥 清理 controller
      }

    } catch (error) {
      // 🔥 清理超时定时器和 controller
      clearTimeout(timeoutId)
      abortControllersRef.current.delete(jobId)

      // 忽略 AbortError (主动取消的请求)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`轮询任务 ${jobId} 被取消或超时`)
        return
      }

      console.error(`轮询任务 ${jobId} 状态时出错:`, error)
      ErrorReporter.getInstance().reportError(error, `Video polling - Job ${jobId}`)

      // 增加错误计数
      const errorCount = (errorCountRef.current.get(jobId) || 0) + 1
      errorCountRef.current.set(jobId, errorCount)

      // 如果连续错误过多，停止轮询
      if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
        const errorMessage = error instanceof Error ? error.message : "Polling status failed"
        console.error(`任务 ${jobId} 轮询失败次数过多，停止轮询`)

        videoContext.failJob(jobId, `Polling failed: ${errorMessage}`)
        onFailed?.(job, errorMessage)

        stoppedJobIdsRef.current.add(jobId) // 立即标记停止
        setPollingJobIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(jobId)
          return newSet
        })
        errorCountRef.current.delete(jobId)
        startTimeRef.current.delete(jobId)
      }
    }
  }, [videoContext, onCompleted, onFailed, onProgress, saveVideoToDatabase])

  // 轮询存储进度
  const pollStorageProgress = useCallback(async (videoId: string, originalJob: VideoJob) => {
    try {

      // Use resilient API client with automatic retries
      const response = await videoApiClient.getStorageProgress(videoId)

      if (!response.success) {
        throw new Error(response.error || "Storage progress query failed")
      }

      const { status, progress, error: storageError } = response.data.data


      // Update job progress
      videoContext.updateJob(originalJob.id, {
        progress: progress || 0,
        status: status === 'completed' ? 'completed' : 'storing'
      })

      switch (status) {
        case 'completed':

          // 🔥 修复：存储完成时只更新状态，不再重复调用completeJob
          // 通过handleVideoStorageCompleted通知数据库存储完成即可
          try {
            await videoContext.handleVideoStorageCompleted?.(videoId)
          } catch (storageError) {
            console.warn('handleVideoStorageCompleted failed but storage completed:', storageError)
          }

          // Stop polling this storage
          setStoragePollingIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(videoId)
            return newSet
          })

          onCompleted?.(originalJob, originalJob.resultUrl)
          break

        case 'failed':
          console.error(`❌ Video storage failed: ${videoId} - ${storageError}`)

          // 🔥 修复：存储失败时不再重复调用completeJob，视频已经在completedVideos中
          console.warn(`Video ${originalJob.id} storage failed, keeping in temporary state`)

          // Stop polling this storage
          setStoragePollingIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(videoId)
            return newSet
          })
          break

        case 'downloading':
        case 'processing':
          // Continue polling, progress is already updated above
          break

        default:
          console.warn(`Unknown storage status for video ${videoId}: ${status}`)
      }

    } catch (error) {
      console.error(`Error polling storage progress for ${videoId}:`, error)
      ErrorReporter.getInstance().reportError(error, 'Storage polling')

      // 🔥 修复：错误时不再重复调用completeJob，视频已经在completedVideos中
      console.warn(`Video ${originalJob.id} storage polling error, keeping in temporary state`)

      // Stop polling this storage
      setStoragePollingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }, [videoContext, onCompleted])

  // Start storage polling for a video
  const startStoragePolling = useCallback((videoId: string, originalJob: VideoJob) => {
    setStoragePollingIds(prev => new Set(prev).add(videoId))

    // Store the original job reference for later use
    startTimeRef.current.set(`storage_${videoId}`, Date.now())

    // Start polling immediately, then continue with interval
    pollStorageProgress(videoId, originalJob)
  }, [pollStorageProgress])

  // Poll all storage jobs
  const pollAllStorageJobs = useCallback(async () => {
    if (storagePollingIds.size === 0) return


    // 🔥 优化：收集所有需要轮询的存储任务
    const storageTasks: Array<{ videoId: string; job: VideoJob }> = []

    for (const videoId of storagePollingIds) {
      const job = videoContext.activeJobs.find(j => j.videoId === videoId)
      if (job) {
        storageTasks.push({ videoId, job })
      } else {
        // If no job found, stop polling this storage
        setStoragePollingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
      }
    }

    // 🔥 批量处理存储轮询,限制并发数量
    for (let i = 0; i < storageTasks.length; i += MAX_CONCURRENT_POLLS) {
      const batch = storageTasks.slice(i, i + MAX_CONCURRENT_POLLS)

      await Promise.allSettled(
        batch.map(({ videoId, job }) => pollStorageProgress(videoId, job))
      )

      // 如果还有下一批,添加小延迟
      if (i + MAX_CONCURRENT_POLLS < storageTasks.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }, [storagePollingIds, pollStorageProgress, videoContext.activeJobs])

  // 🔥 并发控制辅助函数,防止浏览器资源耗尽
  const pollWithConcurrencyLimit = async (jobs: VideoJob[]) => {
    const results: PromiseSettledResult<void>[] = []

    // 将任务分批处理,每批最多 MAX_CONCURRENT_POLLS 个
    for (let i = 0; i < jobs.length; i += MAX_CONCURRENT_POLLS) {
      const batch = jobs.slice(i, i + MAX_CONCURRENT_POLLS)

      // 批次内并发执行,批次间串行
      const batchResults = await Promise.allSettled(
        batch.map(job => pollJobStatus(job))
      )

      results.push(...batchResults)

      // 如果还有下一批,添加小延迟避免资源竞争
      if (i + MAX_CONCURRENT_POLLS < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  // 轮询所有活跃任务
  const pollAllJobs = useCallback(async () => {
    const jobsToPoll = pollingJobs.filter(job =>
      job.requestId && !stoppedJobIdsRef.current.has(job.id) // 排除已停止的任务
    )

    // 清理已完成但未正确移除的轮询任务
    if (pollingJobIds.size > 0) {
      const jobIdsToClean = new Set<string>()
      const TASK_MAX_AGE = 60 * 60 * 1000 // 🔥 修复：1小时最大年龄限制

      pollingJobIds.forEach(jobId => {
        const job = videoContext.activeJobs.find(j => j.id === jobId)
        if (!job) {
          // 任务不存在，应该清理
          jobIdsToClean.add(jobId)
        } else if (job.status === "completed" || job.status === "failed" || job.status === "storing") {
          // 任务已完成，应该清理
          jobIdsToClean.add(jobId)
        } else {
          // 🔥 修复：检查任务年龄，强制清理过期任务
          const taskAge = Date.now() - new Date(job.createdAt).getTime()
          if (taskAge > TASK_MAX_AGE) {
            console.warn(`🚨 任务 ${jobId} 已存在超过1小时，强制标记为失败并清理`)
            videoContext.failJob(jobId, "Task exceeded maximum age (1 hour)")
            jobIdsToClean.add(jobId)
          }
        }
      })

      if (jobIdsToClean.size > 0) {
        // 将清理的任务添加到停止标记中
        jobIdsToClean.forEach(id => {
          stoppedJobIdsRef.current.add(id)
        })

        setPollingJobIds(prev => {
          const newSet = new Set(prev)
          jobIdsToClean.forEach(id => {
            newSet.delete(id)
            startTimeRef.current.delete(id)
            errorCountRef.current.delete(id)
          })
          return newSet
        })
      }
    }

    if (jobsToPoll.length === 0) {
      return
    }


    // 🔥 使用并发控制的轮询,防止资源耗尽
    await pollWithConcurrencyLimit(jobsToPoll)
  }, [pollingJobs, pollJobStatus, pollingJobIds, videoContext.activeJobs])

  // 启动轮询
  const startPolling = useCallback((jobId: string) => {
    // 清除之前的停止标记，允许重新轮询
    stoppedJobIdsRef.current.delete(jobId)

    setPollingJobIds(prev => {
      const newSet = new Set(prev).add(jobId)
      return newSet
    })
    startTimeRef.current.set(jobId, Date.now())
    errorCountRef.current.delete(jobId)
  }, [])

  // 停止轮询
  const stopPolling = useCallback((jobId?: string) => {
    if (jobId) {
      stoppedJobIdsRef.current.add(jobId) // 添加停止标记

      // 🔥 修复2: 取消进行中的请求
      const controller = abortControllersRef.current.get(jobId)
      if (controller) {
        controller.abort()
        abortControllersRef.current.delete(jobId)
      }

      // 🔥 清理重试 timeout
      const retryTimeoutKey = `storage_${jobId}`
      if (retryTimeoutsRef.current.has(retryTimeoutKey)) {
        clearTimeout(retryTimeoutsRef.current.get(retryTimeoutKey)!)
        retryTimeoutsRef.current.delete(retryTimeoutKey)
      }

      setPollingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
      startTimeRef.current.delete(jobId)
      errorCountRef.current.delete(jobId)
    } else {
      // 🔥 修复2: 停止所有轮询时，取消所有进行中的请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()

      // 🔥 清理所有重试 timeout
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      retryTimeoutsRef.current.clear()

      setPollingJobIds(new Set())
      setStoragePollingIds(new Set())
      startTimeRef.current.clear()
      errorCountRef.current.clear()
      stoppedJobIdsRef.current.clear() // 清空所有停止标记
    }
  }, [])

  // 停止存储轮询
  const stopStoragePolling = useCallback((videoId?: string) => {
    if (videoId) {
      setStoragePollingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
      startTimeRef.current.delete(`storage_${videoId}`)
    } else {
      setStoragePollingIds(new Set())
      // Clean up storage-related entries from startTimeRef
      for (const key of startTimeRef.current.keys()) {
        if (key.startsWith('storage_')) {
          startTimeRef.current.delete(key)
        }
      }
    }
  }, [])

  // 重启轮询
  const restartPolling = useCallback(() => {

    // 找到所有需要轮询的任务
    const jobsToRestart = videoContext.activeJobs
      .filter(job => (job.status === "processing" || job.status === "queued" || job.status === "created") && job.requestId)
      .map(job => job.id)

    setPollingJobIds(new Set(jobsToRestart))
    errorCountRef.current.clear()

    // 重新设置开始时间
    const now = Date.now()
    jobsToRestart.forEach(jobId => {
      startTimeRef.current.set(jobId, now)
    })
  }, [videoContext.activeJobs])

  // 管理生成轮询定时器
  useEffect(() => {
    if (!enabled || pollingJobIds.size === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 立即执行一次
    pollAllJobs()

    // 设置定时器
    intervalRef.current = setInterval(pollAllJobs, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, pollingJobIds.size, interval, pollAllJobs])

  // 管理存储轮询定时器
  useEffect(() => {
    if (!enabled || storagePollingIds.size === 0) {
      if (storageIntervalRef.current) {
        clearInterval(storageIntervalRef.current)
        storageIntervalRef.current = null
      }
      return
    }

    // 立即执行一次
    pollAllStorageJobs()

    // 设置定时器（存储轮询使用相同间隔）
    storageIntervalRef.current = setInterval(pollAllStorageJobs, interval)

    return () => {
      if (storageIntervalRef.current) {
        clearInterval(storageIntervalRef.current)
        storageIntervalRef.current = null
      }
    }
  }, [enabled, storagePollingIds.size, interval, pollAllStorageJobs])

  // 🔥 修复3: 优化自动恢复轮询任务,避免无限循环
  // 使用更精确的依赖追踪,只在 activeJobs 长度变化时检查
  const activeJobsLengthRef = useRef(0)
  const lastCheckTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled || !videoContext) return

    const currentLength = videoContext.activeJobs.length
    const currentPollingCount = pollingJobIds.size
    const now = Date.now()

    // 🔥 防抖：避免频繁检查 (至少间隔 3 秒)
    if (now - lastCheckTimeRef.current < 3000) {
      return
    }

    // 🔥 仅在以下情况触发检查:
    // 1. 任务数量变化
    // 2. 有活跃任务但没有轮询
    const shouldCheck =
      currentLength !== activeJobsLengthRef.current ||
      (currentLength > 0 && currentPollingCount === 0)

    if (!shouldCheck) {
      return
    }

    activeJobsLengthRef.current = currentLength
    lastCheckTimeRef.current = now

    // 等待VideoContext初始化完成
    const timer = setTimeout(() => {
      const activeJobs = videoContext.activeJobs || []

      const jobsNeedingPolling = activeJobs.filter(job => {
        const needsPolling = job.requestId &&
          (job.status === "processing" || job.status === "queued" || job.status === "created") &&
          !pollingJobIds.has(job.id) &&
          !stoppedJobIdsRef.current.has(job.id) // 🔥 不重启已停止的任务

        return needsPolling
      })

      if (jobsNeedingPolling.length > 0) {
        jobsNeedingPolling.forEach(job => {
          startPolling(job.id)
        })
      }
    }, 2000) // 延长到2秒，确保初始化完成

    return () => clearTimeout(timer)
  }, [videoContext?.activeJobs.length, pollingJobIds.size, enabled, startPolling]) // 🔥 更精确的依赖

  // 🔥 健康检查定时器,定期清理无效任务
  useEffect(() => {
    // 立即执行一次清理
    cleanInvalidJobs()

    // 每30秒执行一次健康检查
    const healthCheckTimer = setInterval(() => {
      cleanInvalidJobs()
    }, HEALTH_CHECK_INTERVAL)

    return () => {
      clearInterval(healthCheckTimer)
    }
  }, [cleanInvalidJobs])

  // 🔥 修复1+2: 页面卸载时彻底清理所有资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (storageIntervalRef.current) {
        clearInterval(storageIntervalRef.current)
      }

      // 🔥 清理所有重试 timeout
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      retryTimeoutsRef.current.clear()

      // 🔥 取消所有进行中的请求
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  return {
    isPolling,
    pollingJobs,
    isStoragePolling,
    storagePollingCount,
    startPolling,
    stopPolling,
    stopStoragePolling,
    restartPolling
  }
}
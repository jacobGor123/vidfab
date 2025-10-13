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

  // 使用 ref 立即同步追踪应该停止轮询的任务，避免异步状态更新导致的时序问题
  const stoppedJobIdsRef = useRef<Set<string>>(new Set())

  // 🔥 改进的数据库保存函数，包含重试机制
  const saveVideoToDatabase = useCallback(async (job: VideoJob, resultUrl: string, retryCount = 0) => {
    try {

      const response = await fetch('/api/video/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: job.userId,
          userEmail: job.userEmail || 'unknown@vidfab.ai',
          wavespeedRequestId: job.requestId,
          originalUrl: resultUrl,
          settings: {
            ...job.settings,
            prompt: job.prompt
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data.videoId) {

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
      console.error(`❌ Video storage attempt ${retryCount + 1} failed:`, error)

      // 🔥 如果还有重试次数，等待后重试
      if (retryCount < MAX_STORAGE_RETRIES) {
        setTimeout(() => {
          saveVideoToDatabase(job, resultUrl, retryCount + 1)
        }, STORAGE_RETRY_DELAY * (retryCount + 1)) // 递增延迟
      } else {
        console.error(`💥 All storage attempts failed for video ${job.id}. Video will remain in temporary storage.`)
        // 🔥 所有重试失败时，仍然保持视频在临时存储中可见
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
    // 立即检查任务是否已被标记停止，避免重复处理
    if (stoppedJobIdsRef.current.has(job.id)) {
      return
    }

    if (!job.requestId) {
      console.warn(`Job ${job.id} has no requestId, stopping polling`)
      stoppedJobIdsRef.current.add(job.id) // 立即标记停止
      setPollingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(job.id)
        return newSet
      })
      return
    }

    try {

      // 🔥 简化状态检查：直接使用fetch，跳过复杂的API client
      const response = await fetch(`/api/video/status/${job.requestId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        if (response.status === 404) {
          // 任务不存在或已过期
          console.warn(`Task ${job.requestId} not found, marking as failed`)
          videoContext.failJob(job.id, "Task expired or not found")
          stoppedJobIdsRef.current.add(job.id) // 立即标记停止
          setPollingJobIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(job.id)
            return newSet
          })
          return
        }

        throw new Error(`HTTP ${response.status}`)
      }

      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'API Error')
      }

      const { status, progress, resultUrl, error } = responseData.data


      // 重置错误计数
      errorCountRef.current.delete(job.id)

      switch (status) {
        case "completed":
          if (resultUrl) {

            // 🔥 1. 简化积分处理 - 直接触发积分刷新（因为我们使用即时扣除模式）
            console.log('✅ 视频生成完成，触发积分刷新')

            // 触发前端积分刷新（通过广播事件）
            window.dispatchEvent(new CustomEvent('credits-updated', {
              detail: {
                videoCompleted: true,
                jobId: job.id
              }
            }))

            // 🔥 2. 关键修复：先更新状态，再停止轮询
            const updateData = {
              status: 'completed' as const,
              progress: 100,
              resultUrl: resultUrl
            }
            videoContext.updateJob(job.id, updateData)

            // 3. 触发完成回调，确保前端更新
            onCompleted?.(job, resultUrl)

            // 4. 然后停止轮询
            stoppedJobIdsRef.current.add(job.id)
            setPollingJobIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(job.id)
              return newSet
            })

            // 5. 🔥 立即将视频添加到completedVideos供用户预览，标记为临时存储
            videoContext.completeJob(job.id, {
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
            console.warn(`⚠️ Video generation completed but no result URL: ${job.id}`)
            videoContext.failJob(job.id, "Video generation completed but no result URL returned")
            onFailed?.(job, "Video generation completed but no result URL returned")
          }
          break

        case "failed":
          // 🔥 1. 先释放预扣的积分
          if (job.reservationId) {
            try {
              const releaseResponse = await fetch('/api/subscription/credits/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reservation_id: job.reservationId
                })
              })

              if (releaseResponse.ok) {
                const releaseData = await releaseResponse.json()
                console.log(`✅ 积分释放成功 - 用户: ${job.userId}, 释放积分: ${releaseData.credits_released}`)

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
              console.error('❌ 积分释放API调用失败:', releaseError)
            }
          } else {
            console.warn('⚠️ 视频失败但缺少 reservationId，无法释放积分')
          }

          // 🔥 2. 任务失败处理
          const failureReason = error || "Video generation failed"
          videoContext.failJob(job.id, failureReason)
          onFailed?.(job, failureReason)

          // 停止轮询此任务
          stoppedJobIdsRef.current.add(job.id) // 立即标记停止
          setPollingJobIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(job.id)
            return newSet
          })

          console.error(`❌ 任务失败: ${job.id} - ${failureReason}`)
          break

        case "processing":
        case "queued":
        case "created":
          // 更新进度
          if (progress !== undefined && progress !== job.progress) {
            videoContext.updateJob(job.id, { progress })
            onProgress?.(job, progress)
          }

          // 检查是否超过最大轮询时间
          const startTime = startTimeRef.current.get(job.id) || Date.now()
          if (Date.now() - startTime > MAX_POLLING_DURATION) {
            console.warn(`任务 ${job.id} 轮询超时，停止轮询`)
            videoContext.failJob(job.id, "Task timeout")
            onFailed?.(job, "Task timeout")
            stoppedJobIdsRef.current.add(job.id) // 立即标记停止
            setPollingJobIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(job.id)
              return newSet
            })
          }
          break

        default:
          console.warn(`Unknown status for job ${job.id}: ${status}`)
      }

    } catch (error) {
      console.error(`轮询任务 ${job.id} 状态时出错:`, error)
      ErrorReporter.getInstance().reportError(error, `Video polling - Job ${job.id}`)

      // 增加错误计数
      const errorCount = (errorCountRef.current.get(job.id) || 0) + 1
      errorCountRef.current.set(job.id, errorCount)

      // 如果连续错误过多，停止轮询
      if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
        const errorMessage = error instanceof Error ? error.message : "Polling status failed"
        console.error(`任务 ${job.id} 轮询失败次数过多，停止轮询`)

        videoContext.failJob(job.id, `Polling failed: ${errorMessage}`)
        onFailed?.(job, errorMessage)

        stoppedJobIdsRef.current.add(job.id) // 立即标记停止
        setPollingJobIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(job.id)
          return newSet
        })
        errorCountRef.current.delete(job.id)
        startTimeRef.current.delete(job.id)
      }
    }
  }, [videoContext, onCompleted, onFailed, onProgress])

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


    // We need to get the original job data for each storage polling
    // For now, we'll implement a simpler approach
    for (const videoId of storagePollingIds) {
      // Find the job that has this videoId
      const job = videoContext.activeJobs.find(j => j.videoId === videoId)
      if (job) {
        await pollStorageProgress(videoId, job)
      } else {
        // If no job found, stop polling this storage
        setStoragePollingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
      }
    }
  }, [storagePollingIds, pollStorageProgress, videoContext.activeJobs])

  // 轮询所有活跃任务
  const pollAllJobs = useCallback(async () => {
    const jobsToPoll = pollingJobs.filter(job =>
      job.requestId && !stoppedJobIdsRef.current.has(job.id) // 排除已停止的任务
    )

    // 清理已完成但未正确移除的轮询任务
    if (pollingJobIds.size > 0) {
      const jobIdsToClean = new Set<string>()

      pollingJobIds.forEach(jobId => {
        const job = videoContext.activeJobs.find(j => j.id === jobId)
        if (!job) {
          // 任务不存在，应该清理
          jobIdsToClean.add(jobId)
        } else if (job.status === "completed" || job.status === "failed" || job.status === "storing") {
          // 任务已完成，应该清理
          jobIdsToClean.add(jobId)
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


    // 并发轮询所有任务
    await Promise.allSettled(
      jobsToPoll.map(job => pollJobStatus(job))
    )
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
      setPollingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
      startTimeRef.current.delete(jobId)
      errorCountRef.current.delete(jobId)
    } else {
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

  // 🔥 改进：自动恢复轮询任务
  useEffect(() => {
    if (!enabled || !videoContext) return


    // 等待VideoContext初始化完成
    const timer = setTimeout(() => {
      const activeJobs = videoContext.activeJobs || []


      const jobsNeedingPolling = activeJobs.filter(job => {
        const needsPolling = job.requestId &&
          (job.status === "processing" || job.status === "queued" || job.status === "created") &&
          !pollingJobIds.has(job.id)


        return needsPolling
      })

      if (jobsNeedingPolling.length > 0) {
        jobsNeedingPolling.forEach(job => {
          startPolling(job.id)
        })
      } else {
      }
    }, 2000) // 延长到2秒，确保初始化完成

    return () => clearTimeout(timer)
  }, [videoContext, enabled, startPolling]) // 简化依赖项

  // 页面卸载时清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (storageIntervalRef.current) {
        clearInterval(storageIntervalRef.current)
      }
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
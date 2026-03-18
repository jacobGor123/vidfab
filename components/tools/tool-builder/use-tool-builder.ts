"use client"

/**
 * Tool Builder Hook
 * 工具页构建器状态管理，复用现有轮询体系
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { BuilderConfig } from "@/lib/tools/tool-configs"
import type { VideoJob } from "@/lib/types/video"

export interface ToolBuilderParams {
  mode: "text-to-video" | "image-to-video"
  prompt: string
  imageUrl: string | null
  aspectRatio: string
  duration: number
  resolution: string
  audio: boolean
  size: string  // Sora 2 用，如 "1280*720"
}

export interface ToolBuilderState extends ToolBuilderParams {
  isSubmitting: boolean
  error: string | null
  currentJobId: string | null
}

/** 根据参数计算 veo3-fast 积分消耗（与服务端逻辑保持一致） */
export function calcKling3Credits(duration: number, audio: boolean = false): number {
  return audio ? duration * 15 : duration * 10
}

export function calcVeo3Credits(resolution: string, duration: number, audio: boolean = false): number {
  if (audio) {
    if (resolution === "1080p") {
      if (duration <= 4) return 90
      if (duration <= 6) return 110
      return 130
    }
    // 720p
    if (duration <= 4) return 60
    if (duration <= 6) return 80
    return 100
  } else {
    if (resolution === "1080p") {
      if (duration <= 4) return 70
      if (duration <= 6) return 90
      return 110
    }
    // 720p
    if (duration <= 4) return 40
    if (duration <= 6) return 60
    return 80
  }
}

export function useToolBuilder(config: BuilderConfig) {
  const { data: session } = useSession()
  const videoContext = useVideoContext()
  const { startPolling } = useVideoPollingV2({ enabled: true })

  const pollingStartedRef = useRef<Set<string>>(new Set())
  const activeJobsRef = useRef(videoContext.activeJobs)
  activeJobsRef.current = videoContext.activeJobs

  const [state, setState] = useState<ToolBuilderState>({
    mode: "text-to-video",
    prompt: "",
    imageUrl: null,
    aspectRatio: config.defaultParams.aspectRatio,
    duration: config.defaultParams.duration,
    resolution: config.defaultParams.resolution,
    audio: config.defaultParams.audio,
    size: config.defaultParams.size ?? "",
    isSubmitting: false,
    error: null,
    currentJobId: null,
  })

  // 自动为有 requestId 的任务启动轮询（与 CreatePageClient 逻辑一致）
  useEffect(() => {
    const jobs = activeJobsRef.current
    jobs.forEach((job) => {
      if (
        job?.id &&
        job?.requestId &&
        (job.status === "processing" || job.status === "generating" || job.status === "pending") &&
        !pollingStartedRef.current.has(job.requestId)
      ) {
        pollingStartedRef.current.add(job.requestId)
        startPolling(job)
      }
    })

    // 清理已结束任务的追踪
    const activeIds = new Set(
      jobs.filter((j) => j?.requestId).map((j) => j.requestId!)
    )
    pollingStartedRef.current.forEach((id) => {
      if (!activeIds.has(id)) pollingStartedRef.current.delete(id)
    })
  }, [videoContext.activeJobs, startPolling])

  const setParam = useCallback(<K extends keyof ToolBuilderParams>(
    key: K,
    value: ToolBuilderParams[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  // 精确用 currentJobId 查找，避免多个同模型并发任务时互相覆盖
  const currentJob: VideoJob | null = (() => {
    if (!state.currentJobId) return null
    const activeJob = videoContext.activeJobs.find((j) => j.id === state.currentJobId)
    if (activeJob) return activeJob
    return videoContext.failedJobs?.find((j) => j.id === state.currentJobId) ?? null
  })()

  const submit = useCallback(async () => {
    if (!session?.user?.uuid) {
      setState((prev) => ({ ...prev, error: "Please sign in to generate videos." }))
      return
    }
    if (!state.prompt.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter a prompt." }))
      return
    }
    if (state.mode === "image-to-video" && !state.imageUrl) {
      setState((prev) => ({ ...prev, error: "Please upload a reference image." }))
      return
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }))

    // 1. 在 context 中创建本地 job
    const job = videoContext.addJob({
      requestId: "",
      userId: session.user.uuid,
      prompt: state.prompt,
      sourceImage: state.imageUrl ?? undefined,
      generationType: state.mode,
      settings: {
        generationType: state.mode,
        model: config.textToVideoModel,
        duration: String(state.duration),
        resolution: state.resolution,
        aspectRatio: state.aspectRatio,
      },
      status: "generating",
      progress: 0,
    })

    setState((prev) => ({ ...prev, currentJobId: job.id }))

    try {
      // 2. 调用 API（支持 generateAudio 参数）
      const isSora = config.textToVideoModel === "sora-2"
      const isKling = config.textToVideoModel === "kling-3"
      const body: Record<string, unknown> = {
        prompt: state.prompt,
        model: config.textToVideoModel,
        duration: state.duration,
        resolution: (isSora || isKling) ? "720p" : state.resolution,
        aspectRatio: isSora ? "16:9" : state.aspectRatio,
        ...(isSora && state.mode === "text-to-video" ? { size: state.size } : {}),
        ...(!isSora ? { generateAudio: state.audio } : {}),
      }
      if (state.mode === "image-to-video" && state.imageUrl) {
        body.image = state.imageUrl
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        videoContext.removeJob(job.id)
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          currentJobId: null,
          error: data.message || data.error || `Error ${response.status}`,
        }))
        return
      }

      if (!data.data?.requestId) {
        videoContext.removeJob(job.id)
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          currentJobId: null,
          error: "API response missing requestId",
        }))
        return
      }

      // 3. 更新 job 状态，轮询 effect 会自动捕获并启动
      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: "processing",
      })

      setState((prev) => ({ ...prev, isSubmitting: false }))
    } catch (err) {
      videoContext.removeJob(job.id)
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        currentJobId: null,
        error: err instanceof Error ? err.message : "Generation failed",
      }))
    }
  }, [session, state, config, videoContext])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const resetResult = useCallback(() => {
    setState((prev) => ({ ...prev, currentJobId: null, error: null }))
  }, [])

  const credits = config.textToVideoModel === "sora-2"
    ? [40, 80, 120][[4, 8, 12].indexOf(state.duration)] ?? 40
    : config.textToVideoModel === "kling-3"
    ? calcKling3Credits(state.duration, state.audio)
    : calcVeo3Credits(state.resolution, state.duration, state.audio)

  const isJobActive = !!currentJob && !["completed", "failed"].includes(currentJob.status)

  return {
    state,
    setParam,
    submit,
    clearError,
    resetResult,
    currentJob,
    credits,
    isAuthenticated: !!session?.user,
    isJobActive,
  }
}

"use client"

/**
 * Unified Video Generation Hook
 * 统一的视频生成Hook，支持text-to-video和image-to-video
 *
 * 使用方式：
 * 1. Text-to-Video: 不传image参数
 * 2. Image-to-Video: 传入image参数
 *
 * 完全向后兼容，无缝复用现有的Context和Hooks架构
 */

import { useCallback } from "react"
import { useVideoGeneration } from "./use-video-generation"
import { useVideoPolling } from "./use-video-polling"
import { useVideoGenerationAuth } from "./use-auth-modal"
import { VideoGenerationRequest, getGenerationType } from "@/lib/types/video"

interface UseUnifiedVideoGenerationOptions {
  onSuccess?: (jobId: string, generationType: "text-to-video" | "image-to-video") => void
  onError?: (error: string, generationType: "text-to-video" | "image-to-video") => void
  onAuthRequired?: () => void
  enableAutoPolling?: boolean  // 是否自动开始轮询，默认true
}

interface UseUnifiedVideoGenerationReturn {
  // 统一的生成方法
  generateVideo: (request: VideoGenerationRequest) => Promise<string | null>

  // 专用生成方法（可选）
  generateTextToVideo: (request: Omit<VideoGenerationRequest, "image" | "imageStrength">) => Promise<string | null>
  generateImageToVideo: (request: Required<Pick<VideoGenerationRequest, "image">> & VideoGenerationRequest) => Promise<string | null>

  // 状态和控制
  isGenerating: boolean
  error: string | null
  clearError: () => void

  // 轮询控制
  isPolling: boolean
  pollingJobs: any[]
  startPolling: (jobId: string) => void
  stopPolling: (jobId?: string) => void

  // 认证状态
  isAuthModalOpen: boolean
  requireAuth: (action: () => void | Promise<void>) => Promise<boolean>
  isAuthenticated: boolean
}

export function useUnifiedVideoGeneration(
  options: UseUnifiedVideoGenerationOptions = {}
): UseUnifiedVideoGenerationReturn {
  const {
    onSuccess,
    onError,
    onAuthRequired,
    enableAutoPolling = true
  } = options

  // 使用现有的hooks
  const {
    generateVideo: baseGenerateVideo,
    isGenerating,
    error,
    clearError
  } = useVideoGeneration({
    onSuccess: (jobId) => {
      if (enableAutoPolling) {
        startPolling(jobId)
      }
      onSuccess?.(jobId, "text-to-video") // 默认类型，实际类型会在内部处理
    },
    onError: (error) => {
      onError?.(error, "text-to-video") // 默认类型
    },
    onAuthRequired
  })

  const {
    isPolling,
    pollingJobs,
    startPolling,
    stopPolling
  } = useVideoPolling({
    onCompleted: (job, resultUrl) => {
      console.log(`✅ Video generation completed: ${job.generationType || 'text-to-video'}`)
    },
    onFailed: (job, error) => {
      console.error(`❌ Video generation failed: ${job.generationType || 'text-to-video'} - ${error}`)
    }
  })

  const {
    isAuthModalOpen,
    requireAuth,
    isAuthenticated
  } = useVideoGenerationAuth()

  // 统一的生成方法
  const generateVideo = useCallback(async (
    request: VideoGenerationRequest
  ): Promise<string | null> => {
    const generationType = getGenerationType(request)

    console.log(`🚀 Starting ${generationType} generation:`, {
      hasPrompt: !!request.prompt,
      hasImage: !!request.image,
      model: request.model,
      resolution: request.resolution
    })

    const result = await baseGenerateVideo(request)

    if (result && onSuccess) {
      onSuccess(result, generationType)
    }

    return result
  }, [baseGenerateVideo, onSuccess])

  // 专用的text-to-video方法
  const generateTextToVideo = useCallback(async (
    request: Omit<VideoGenerationRequest, "image" | "imageStrength">
  ): Promise<string | null> => {
    return generateVideo(request as VideoGenerationRequest)
  }, [generateVideo])

  // 专用的image-to-video方法
  const generateImageToVideo = useCallback(async (
    request: Required<Pick<VideoGenerationRequest, "image">> & VideoGenerationRequest
  ): Promise<string | null> => {
    if (!request.image) {
      throw new Error("Image is required for image-to-video generation")
    }

    return generateVideo(request)
  }, [generateVideo])

  return {
    // 统一接口
    generateVideo,

    // 专用接口
    generateTextToVideo,
    generateImageToVideo,

    // 状态
    isGenerating,
    error,
    clearError,

    // 轮询
    isPolling,
    pollingJobs,
    startPolling,
    stopPolling,

    // 认证
    isAuthModalOpen,
    requireAuth,
    isAuthenticated
  }
}

/**
 * 简化的统一视频生成hook
 * 适合快速集成，使用默认配置
 */
export function useSimpleUnifiedVideoGeneration() {
  return useUnifiedVideoGeneration({
    onSuccess: (jobId, generationType) => {
      console.log(`✅ ${generationType} generation started: ${jobId}`)
    },
    onError: (error, generationType) => {
      console.error(`❌ ${generationType} generation failed:`, error)
    },
    enableAutoPolling: true
  })
}

/**
 * 类型守卫：检查是否为image-to-video请求
 */
export function isImageToVideoRequest(
  request: VideoGenerationRequest
): request is Required<Pick<VideoGenerationRequest, "image">> & VideoGenerationRequest {
  return !!request.image
}

/**
 * 类型守卫：检查是否为text-to-video请求
 */
export function isTextToVideoRequest(
  request: VideoGenerationRequest
): request is Omit<VideoGenerationRequest, "image" | "imageStrength"> {
  return !request.image
}
"use client"

/**
 * Video Generation Hook
 * 处理视频生成的核心业务逻辑
 */

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { VideoGenerationRequest, VideoGenerationSettings, getGenerationType, validateImageData } from "@/lib/types/video"
import { getEstimatedGenerationTime } from "@/lib/services/wavespeed-api"

interface UseVideoGenerationOptions {
  onSuccess?: (jobId: string) => void
  onError?: (error: string) => void
  onAuthRequired?: () => void
}

interface UseVideoGenerationReturn {
  generateVideo: (request: VideoGenerationRequest) => Promise<string | null>
  isGenerating: boolean
  error: string | null
  clearError: () => void
}

export function useVideoGeneration(
  options: UseVideoGenerationOptions = {}
): UseVideoGenerationReturn {
  const { data: session, status } = useSession()
  const videoContext = useVideoContext()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { onSuccess, onError, onAuthRequired } = options

  const generateVideo = useCallback(async (
    request: VideoGenerationRequest
  ): Promise<string | null> => {
    try {
      setIsGenerating(true)
      setError(null)

      // 检查用户登录状态
      if (status === "loading") {
        throw new Error("正在检查登录状态，请稍候...")
      }

      if (!session?.user) {
        setError("This operation requires login")
        onAuthRequired?.()
        return null
      }

      // 确定生成类型
      const generationType = getGenerationType(request)

      // 如果是image-to-video，验证图片参数
      if (generationType === "image-to-video") {
        if (!request.image) {
          throw new Error("Image-to-video generation requires an image")
        }

        if (!validateImageData(request.image)) {
          throw new Error("Invalid image format. Please provide a valid image.")
        }
      }

      console.log("🚀 开始生成视频:", {
        prompt: request.prompt.substring(0, 50) + "...",
        model: request.model,
        resolution: request.resolution,
        duration: request.duration,
        generationType,
        hasImage: !!request.image,
        user: session.user.email
      })

      // 预先创建本地任务记录
      const estimatedTime = getEstimatedGenerationTime(
        request.resolution,
        typeof request.duration === "string"
          ? parseInt(request.duration.replace("s", ""))
          : request.duration
      )

      const localJob = videoContext.addJob({
        requestId: "", // 将在API响应后更新
        prompt: request.prompt,
        settings: {
          model: request.model,
          duration: request.duration.toString(),
          resolution: request.resolution,
          aspectRatio: request.aspectRatio,
          seed: request.seed,
          // Image-to-video 特有设置
          imageStrength: request.imageStrength,
          generationType
        },
        status: "pending",
        userId: session.user.uuid,
        userEmail: session.user.email, // 🔥 添加userEmail用于存储
        progress: 0,
        // 保存源图片引用（不在设置中存储敏感数据）
        sourceImage: request.image,
        generationType
      })

      try {
        // 调用后端API
        const response = await fetch("/api/video/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        })

        const data = await response.json()

        if (!response.ok) {
          // 处理API错误
          if (data.code === "AUTH_REQUIRED") {
            onAuthRequired?.()
            throw new Error("Please log in first")
          }

          throw new Error(data.error || `API Error: ${response.status}`)
        }

        if (!data.success || !data.data?.requestId) {
          throw new Error("API Response Error")
        }

        // 更新本地任务记录
        videoContext.updateJob(localJob.id, {
          requestId: data.data.requestId,
          status: "processing"
        })

        console.log("✅ 视频生成任务已提交:", {
          localJobId: localJob.id,
          requestId: data.data.requestId,
          estimatedTime: `${Math.round(estimatedTime / 60)}分钟`
        })

        onSuccess?.(localJob.id)
        return localJob.id

      } catch (apiError) {
        // API调用失败，标记本地任务为失败
        const errorMessage = apiError instanceof Error ? apiError.message : "未知错误"
        videoContext.failJob(localJob.id, errorMessage)
        throw apiError
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "生成视频时发生未知错误"

      console.error("❌ 视频生成失败:", error)
      setError(errorMessage)
      onError?.(errorMessage)

      return null

    } finally {
      setIsGenerating(false)
    }
  }, [session, status, videoContext, onSuccess, onError, onAuthRequired])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generateVideo,
    isGenerating,
    error,
    clearError
  }
}

/**
 * 简化的视频生成hook，用于快速集成
 */
export function useSimpleVideoGeneration() {
  return useVideoGeneration({
    onSuccess: (jobId) => {
      console.log(`视频生成任务已启动: ${jobId}`)
    },
    onError: (error) => {
      console.error("视频生成失败:", error)
    },
    onAuthRequired: () => {
    }
  })
}
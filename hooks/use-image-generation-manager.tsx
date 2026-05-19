/**
 * Image Generation Manager Hook
 * 统一管理图片生成的状态、轮询和存储逻辑
 * 消除 text-to-image 和 image-to-image 面板的代码重复
 */

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useImageGeneration } from "./use-image-generation"
import { useImageContext, ImageTask } from "@/lib/contexts/image-context"
import { emitCreditsUpdated } from "@/lib/events/credits-events"

// 🔥 V2 迁移：移除 useImagePolling，轮询现在由父组件统一管理

interface UseImageGenerationManagerOptions {
  maxTasks?: number
  onError?: (error: string) => void
  onAuthRequired?: () => void
  onSubscriptionRequired?: () => void  // 🔥 积分不足时调用
}

export function useImageGenerationManager(options: UseImageGenerationManagerOptions = {}) {
  const { maxTasks = 20, onError, onAuthRequired, onSubscriptionRequired } = options
  const { data: session } = useSession()

  // 🔥 使用 Context 管理任务状态
  const imageContext = useImageContext()
  const { tasks, addTask, updateTask, removeTask, getTaskById } = imageContext

  const [error, setError] = useState<string | null>(null)

  // 内部错误处理
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
  }, [onError])

  // 🔥 V2 迁移：移除轮询相关回调，由父组件处理

  // Image generation hook
  const imageGeneration = useImageGeneration({
    onSuccess: (requestId, localId) => {
      console.log('✅ Image generation started:', requestId)
      // 注意：任务会在调用 generateImage 时被添加
    },
    onError: handleError,
    onAuthRequired: onAuthRequired,
    onSubscriptionRequired: onSubscriptionRequired  // 🔥 传递订阅回调
  })

  /**
   * 生成文生图
   */
  const generateTextToImage = useCallback(async (
    prompt: string,
    model: string,
    aspectRatio: string
  ) => {
    const safePrompt = prompt.trim()

    // 验证（不检查登录状态，由 requireAuth 处理）
    if (!safePrompt) {
      handleError("Please enter a description")
      return false
    }

    setError(null)

    try {
      const { requestId, localId } = await imageGeneration.generateTextToImage(safePrompt, {
        model,
        aspectRatio
      })

      // 🔥 通过 Context 添加任务
      const newTask: ImageTask = {
        id: localId,
        requestId,
        prompt: safePrompt,
        model,
        aspectRatio,
        status: "processing",
        createdAt: Date.now(),
        generationType: 'text-to-image'  // 🔥 标记为文生图
      }
      addTask(newTask)

      // 🔥 V2 迁移：移除 startPolling 调用，由父组件自动检测并启动轮询

      // 🔥 触发积分更新事件 (生成开始时API已经扣除积分)
      emitCreditsUpdated('text-to-image-started')

      // 🔥 返回详细信息用于事件追踪
      return {
        success: true,
        requestId,
        localId
      }
    } catch (err) {
      console.error('Generation error:', err)
      return {
        success: false,
        requestId: '',
        localId: ''
      }
    }
  }, [session, imageGeneration, addTask, maxTasks, handleError])

  /**
   * 生成图生图
   */
  const generateImageToImage = useCallback(async (
    images: string[],
    prompt: string,
    model: string
  ) => {
    const safePrompt = prompt.trim()

    // 验证（不检查登录状态，由 requireAuth 处理）
    if (!safePrompt) {
      handleError("Please enter a description")
      return false
    }

    if (!images || images.length === 0) {
      handleError("Please upload at least one image")
      return false
    }

    setError(null)

    try {
      const { requestId, localId } = await imageGeneration.generateImageToImage(
        images,
        safePrompt,
        { model }
      )

      // 🔥 通过 Context 添加任务
      const newTask: ImageTask = {
        id: localId,
        requestId,
        prompt: safePrompt,
        model,
        status: "processing",
        sourceImages: images,
        createdAt: Date.now(),
        generationType: 'image-to-image'  // 🔥 标记为图生图
      }
      addTask(newTask)

      // 🔥 V2 迁移：移除 startPolling 调用，由父组件自动检测并启动轮询

      // 🔥 触发积分更新事件 (生成开始时API已经扣除积分)
      emitCreditsUpdated('image-to-image-started')

      // 🔥 返回详细信息用于事件追踪
      return {
        success: true,
        requestId,
        localId
      }
    } catch (err) {
      console.error('Generation error:', err)
      return {
        success: false,
        requestId: '',
        localId: ''
      }
    }
  }, [session, imageGeneration, addTask, maxTasks, handleError])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 清除所有任务（使用 Context）
   */
  const clearAllTasks = useCallback(() => {
    imageContext.clearTasks()
  }, [imageContext])

  /**
   * 删除单个任务（使用 Context）
   */
  const removeTaskById = useCallback((taskId: string) => {
    removeTask(taskId)
  }, [removeTask])

  return {
    // 状态
    tasks,
    error,
    isGenerating: imageGeneration.isGenerating,
    isAuthenticated: imageGeneration.isAuthenticated,
    // 🔥 V2 迁移：移除 isPolling 和 pollingCount，由父组件管理

    // 方法
    generateTextToImage,
    generateImageToImage,
    clearError,
    clearTasks: clearAllTasks,
    removeTask: removeTaskById,

    // 统计
    processingCount: tasks.filter(t => t.status === "processing").length,
    completedCount: tasks.filter(t => t.status === "completed").length,
    failedCount: tasks.filter(t => t.status === "failed").length
  }
}

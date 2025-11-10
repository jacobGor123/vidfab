/**
 * Image Generation Manager Hook
 * 统一管理图片生成的状态、轮询和存储逻辑
 * 消除 text-to-image 和 image-to-image 面板的代码重复
 */

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useImageGeneration } from "./use-image-generation"
import { useImagePolling } from "./use-image-polling"
import { useImageContext, ImageTask } from "@/lib/contexts/image-context"

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

  // 🔥 使用 useCallback 包装回调，避免闭包陷阱
  const handleCompleted = useCallback((requestId: string, imageUrl: string) => {
    console.log('✅ Image completed:', requestId, imageUrl)
    // 通过 requestId 查找任务
    const task = imageContext.tasks.find(t => t.requestId === requestId)
    if (task) {
      updateTask(task.id, { status: "completed", imageUrl })
    } else {
      console.warn(`⚠️ Task not found for requestId: ${requestId}`)
    }
  }, [imageContext.tasks, updateTask])

  const handleFailed = useCallback((requestId: string, failError: string) => {
    console.error('❌ Image failed:', requestId, failError)
    // 通过 requestId 查找任务
    const task = imageContext.tasks.find(t => t.requestId === requestId)
    if (task) {
      updateTask(task.id, { status: "failed", error: failError })
    } else {
      console.warn(`⚠️ Task not found for requestId: ${requestId}`)
    }
  }, [imageContext.tasks, updateTask])

  const handleStored = useCallback((requestId: string, imageId: string) => {
    console.log('✅ Image stored:', requestId, imageId)
  }, [])

  // Image polling hook - 包含数据库存储
  const imagePolling = useImagePolling({
    userId: session?.user?.uuid,
    userEmail: session?.user?.email || undefined,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onStored: handleStored
  })

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
    // 验证（不检查登录状态，由 requireAuth 处理）
    if (!prompt.trim()) {
      handleError("Please enter a description")
      return false
    }

    setError(null)

    try {
      const { requestId, localId } = await imageGeneration.generateTextToImage(prompt, {
        model,
        aspectRatio
      })

      // 🔥 通过 Context 添加任务
      const newTask: ImageTask = {
        id: localId,
        requestId,
        prompt,
        model,
        aspectRatio,
        status: "processing",
        createdAt: Date.now()
      }
      addTask(newTask)

      // 启动轮询
      imagePolling.startPolling(requestId, localId, {
        userId: session?.user?.uuid,
        userEmail: session?.user?.email || undefined,
        prompt,
        settings: {
          model,
          aspectRatio,
          generationType: 'text-to-image'
        }
      })

      return true
    } catch (err) {
      console.error('Generation error:', err)
      return false
    }
  }, [session, imageGeneration, imagePolling, maxTasks, handleError])

  /**
   * 生成图生图
   */
  const generateImageToImage = useCallback(async (
    images: string[],
    prompt: string,
    model: string
  ) => {
    // 验证（不检查登录状态，由 requireAuth 处理）
    if (!prompt.trim()) {
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
        prompt,
        { model }
      )

      // 🔥 通过 Context 添加任务
      const newTask: ImageTask = {
        id: localId,
        requestId,
        prompt,
        model,
        status: "processing",
        sourceImages: images,
        createdAt: Date.now()
      }
      addTask(newTask)

      // 启动轮询
      imagePolling.startPolling(requestId, localId, {
        userId: session?.user?.uuid,
        userEmail: session?.user?.email || undefined,
        prompt,
        settings: {
          model,
          generationType: 'image-to-image',
          sourceImages: images
        }
      })

      return true
    } catch (err) {
      console.error('Generation error:', err)
      return false
    }
  }, [session, imageGeneration, imagePolling, maxTasks, handleError])

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
    isPolling: imagePolling.isPolling,
    pollingCount: imagePolling.pollingCount,
    isAuthenticated: imageGeneration.isAuthenticated,

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

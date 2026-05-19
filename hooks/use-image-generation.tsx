/**
 * 图片生成 Hook
 * 提供文生图和图生图功能
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// 生成状态
export interface ImageGenerationState {
  isGenerating: boolean
  error: string | null
}

// Hook 选项
interface UseImageGenerationOptions {
  onSuccess?: (requestId: string, localId: string) => void
  onError?: (error: string) => void
  onAuthRequired?: () => void
  onSubscriptionRequired?: () => void  // 🔥 积分不足时调用
}

export function useImageGeneration(options: UseImageGenerationOptions = {}) {
  const { data: session } = useSession()

  const [state, setState] = useState<ImageGenerationState>({
    isGenerating: false,
    error: null
  })

  const hookOptionsRef = useRef<UseImageGenerationOptions>(options)

  // 更新 Hook 选项
  useEffect(() => {
    hookOptionsRef.current = options
  }, [options])

  /**
   * 文生图
   */
  const generateTextToImage = useCallback(async (
    prompt: string,
    settings: {
      model: string
      aspectRatio: string
    }
  ): Promise<{ requestId: string; localId: string }> => {
    if (!session?.user?.uuid) {
      const error = 'Please sign in to generate images'
      hookOptionsRef.current.onAuthRequired?.()
      throw new Error(error)
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }))
    const safePrompt = prompt.trim()

    try {
      const response = await fetch('/api/image/generate-text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 包含认证 cookie
        body: JSON.stringify({
          prompt: safePrompt,
          model: settings.model,
          aspectRatio: settings.aspectRatio
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // 🔥 检查是否是积分不足错误
        if (data.code === 'INSUFFICIENT_CREDITS') {
          hookOptionsRef.current.onSubscriptionRequired?.()
          throw new Error(data.message || 'Insufficient credits')
        }

        const errorMessage = data.error || data.message || 'Failed to generate image'
        throw new Error(errorMessage)
      }

      const { requestId, localId } = data.data

      // 调用成功回调
      hookOptionsRef.current.onSuccess?.(requestId, localId)

      setState(prev => ({ ...prev, isGenerating: false }))

      return { requestId, localId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      hookOptionsRef.current.onError?.(errorMessage)
      throw error
    }
  }, [session])

  /**
   * 图生图
   */
  const generateImageToImage = useCallback(async (
    images: string[],
    prompt: string,
    settings: {
      model: string
    }
  ): Promise<{ requestId: string; localId: string }> => {
    if (!session?.user?.uuid) {
      const error = 'Please sign in to generate images'
      hookOptionsRef.current.onAuthRequired?.()
      throw new Error(error)
    }

    // 验证图片数量
    if (!images || images.length === 0) {
      throw new Error('At least one image is required')
    }

    if (images.length > 3) {
      throw new Error('Maximum 3 images allowed')
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }))
    const safePrompt = prompt.trim()

    try {
      const response = await fetch('/api/image/generate-image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 包含认证 cookie
        body: JSON.stringify({
          images,
          prompt: safePrompt,
          model: settings.model
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // 🔥 检查是否是积分不足错误
        if (data.code === 'INSUFFICIENT_CREDITS') {
          hookOptionsRef.current.onSubscriptionRequired?.()
          throw new Error(data.message || 'Insufficient credits')
        }

        const errorMessage = data.error || data.message || 'Failed to generate image'
        throw new Error(errorMessage)
      }

      const { requestId, localId } = data.data

      // 调用成功回调
      hookOptionsRef.current.onSuccess?.(requestId, localId)

      setState(prev => ({ ...prev, isGenerating: false }))

      return { requestId, localId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      hookOptionsRef.current.onError?.(errorMessage)
      throw error
    }
  }, [session])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    generateTextToImage,
    generateImageToImage,
    clearError,
    isAuthenticated: !!session?.user
  }
}

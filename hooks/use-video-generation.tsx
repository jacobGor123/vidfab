/**
 * 简化的视频生成Hook - 向后兼容版本
 * 使用旧Context，提供基本的视频生成功能
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useVideoContext } from '@/lib/contexts/video-context'

// 🎯 生成状态
export interface VideoGenerationState {
  isGenerating: boolean  // 只表示是否正在提交新任务
  activeJobs: number
  error: string | null
}

// 🎯 生成选项
export interface GenerationOptions {
  onProgress?: (jobId: string, progress: number) => void
  onCompleted?: (jobId: string, videoUrl: string) => void
  onFailed?: (jobId: string, error: string) => void
}

// 🎯 Hook选项（兼容组件的期望）
interface UseVideoGenerationOptions {
  onSuccess?: (jobId: string, requestId: string) => void
  onError?: (error: string) => void
  onAuthRequired?: () => void
}

export function useVideoGeneration(options: UseVideoGenerationOptions = {}) {
  const { data: session } = useSession()
  const videoContext = useVideoContext()

  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false, // 强制重置为false
    activeJobs: 0,
    error: null
  })

  // 初始化状态，不强制重置现有任务
  useEffect(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  const optionsRef = useRef<Map<string, GenerationOptions>>(new Map())
  const hookOptionsRef = useRef<UseVideoGenerationOptions>(options)

  // 更新Hook选项ref
  useEffect(() => {
    hookOptionsRef.current = options
  }, [options])

  // 🎯 监听活跃任务变化
  useEffect(() => {
    // 只计算真正在进行中的任务，排除failed/completed任务
    const activeJobsInProgress = videoContext.activeJobs.filter(job =>
      job.status === 'processing' || job.status === 'queued' || job.status === 'generating'
    )
    const activeJobs = activeJobsInProgress.length

    setState(prev => ({
      ...prev,
      activeJobs
      // 🔥 注意：不再根据activeJobs设置isGenerating
      // isGenerating应该只在API调用过程中为true
    }))

    // 检测完成的任务
    videoContext.activeJobs.forEach(job => {
      if (job.status === 'completed' && job.resultUrl) {
        const options = optionsRef.current.get(job.id)
        options?.onCompleted?.(job.id, job.resultUrl)
        optionsRef.current.delete(job.id)
      } else if (job.status === 'failed') {
        const options = optionsRef.current.get(job.id)
        options?.onFailed?.(job.id, job.error || '生成失败')
        optionsRef.current.delete(job.id)
      } else if (job.status === 'generating') {
        const options = optionsRef.current.get(job.id)
        options?.onProgress?.(job.id, job.progress)
      }
    })
  }, [videoContext.activeJobs])

  // 🎯 文本转视频
  const generateTextToVideo = useCallback(async (
    prompt: string,
    settings: {
      model?: string
      duration?: number
      resolution?: string
      aspectRatio?: string
      style?: string
    } = {},
    options?: GenerationOptions
  ): Promise<string> => {
    if (!session?.user?.uuid) {
      throw new Error('Please sign in to access this feature')
    }


    // 🔥 设置正在生成状态
    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      // 创建新任务
      const job = videoContext.addJob({
        requestId: '', // 将在API调用后设置
        userId: session.user.uuid,
        prompt,
        settings: {
          generationType: 'text-to-video',
          model: settings.model || 'vidfab-q1',
          duration: settings.duration || 5,
          resolution: settings.resolution || '720p',
          aspectRatio: settings.aspectRatio || '16:9',
          style: settings.style || 'realistic'
        },
        status: 'generating',
        progress: 0
      })

      // 保存回调选项
      if (options) {
        optionsRef.current.set(job.id, options)
      }

      // 🔥 调用API生成视频
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 包含认证 cookie
        body: JSON.stringify({
          prompt,
          model: settings.model || 'vidfab-q1',
          duration: settings.duration || 5,
          resolution: settings.resolution || '720p',
          aspectRatio: settings.aspectRatio || '16:9',
          style: settings.style || 'realistic'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // 🔥 API失败时，移除已创建的本地job
        videoContext.removeJob(job.id)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      // 🔥 第1层防护：验证 requestId 是否存在
      if (!data.data?.requestId) {
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      // 🔥 更新job的requestId和reservationId
      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId, // 🔥 保存积分预扣ID
        status: 'processing'
      })

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false }))

      // 🔥 第3层防护：延迟回调，确保 React 状态更新完成
      queueMicrotask(() => {
        hookOptionsRef.current?.onSuccess?.(job.id, data.data.requestId)
      })

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('VideoGeneration: 文本转视频失败:', errorMessage)

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))

      // 🔥 调用onError回调
      hookOptionsRef.current?.onError?.(errorMessage)

      throw error
    }
  }, [session?.user?.uuid, videoContext])

  // 🎯 图片转视频
  const generateImageToVideo = useCallback(async (
    imageUrl: string,
    prompt: string = '',
    settings: {
      model?: string
      duration?: number
      resolution?: string
      aspectRatio?: string
    } = {},
    options?: GenerationOptions
  ): Promise<string> => {
    if (!session?.user?.uuid) {
      throw new Error('Please sign in to access this feature')
    }

    // 🔥 设置正在生成状态
    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      const job = videoContext.addJob({
        requestId: '',
        userId: session.user.uuid,
        prompt: prompt || 'Convert image to video',
        settings: {
          generationType: 'image-to-video',
          imageUrl,
          model: settings.model || 'vidfab-q1',
          duration: settings.duration || 5,
          resolution: settings.resolution || '720p',
          aspectRatio: settings.aspectRatio || '16:9'
        },
        status: 'generating',
        progress: 0
      })

      if (options) {
        optionsRef.current.set(job.id, options)
      }

      // 🔥 调用API生成视频
      const response = await fetch('/api/video/generate-image-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 包含认证 cookie
        body: JSON.stringify({
          image: imageUrl,
          prompt: prompt || 'Convert image to video',
          model: settings.model || 'vidfab-q1',
          duration: settings.duration || 5,
          resolution: settings.resolution || '720p',
          aspectRatio: settings.aspectRatio || '16:9'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // 🔥 API失败时，移除已创建的本地job
        videoContext.removeJob(job.id)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      // 🔥 第1层防护：验证 requestId 是否存在
      if (!data.data?.requestId) {
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      // 🔥 更新job的requestId和reservationId
      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId, // 🔥 保存积分预扣ID
        status: 'processing'
      })

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false }))

      // 🔥 第3层防护：延迟回调，确保 React 状态更新完成
      queueMicrotask(() => {
        hookOptionsRef.current?.onSuccess?.(job.id, data.data.requestId)
      })

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))

      // 🔥 调用onError回调
      hookOptionsRef.current?.onError?.(errorMessage)

      throw error
    }
  }, [session?.user?.uuid, videoContext])

  // 🎯 视频特效 - 兼容旧API签名
  const generateVideoEffects = useCallback(async (
    requestOrVideoUrl: string | { image: string; effectId: string; effectName?: string },
    effectId?: string,
    effectName?: string,
    options?: GenerationOptions
  ): Promise<string> => {
    if (!session?.user?.uuid) {
      const authError = 'Please sign in to access this feature'

      // 🔥 Call onAuthRequired callback
      hookOptionsRef.current?.onAuthRequired?.()

      throw new Error(authError)
    }

    // 处理两种调用方式
    let imageUrl: string, effectIdFinal: string, effectNameFinal: string | undefined

    if (typeof requestOrVideoUrl === 'string') {
      // 新API调用方式：generateVideoEffects(videoUrl, effectId, effectName)
      imageUrl = requestOrVideoUrl
      effectIdFinal = effectId!
      effectNameFinal = effectName
    } else {
      // 旧API调用方式：generateVideoEffects({ image, effectId, effectName })
      imageUrl = requestOrVideoUrl.image
      effectIdFinal = requestOrVideoUrl.effectId
      effectNameFinal = requestOrVideoUrl.effectName
    }

    // 🔥 设置正在生成状态
    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      // 1. 创建本地任务
      const job = videoContext.addJob({
        requestId: '',
        userId: session.user.uuid,
        prompt: `${effectNameFinal || effectIdFinal} Effect`,
        settings: {
          generationType: 'video-effects',
          image: imageUrl,
          effectId: effectIdFinal,
          effectName: effectNameFinal || 'Unknown Effect'
        },
        generationType: 'video-effects', // 🔥 确保这个字段被正确设置
        status: 'pending',
        progress: 0
      })

      if (options) {
        optionsRef.current.set(job.id, options)
      }

      // 2. 🔥 调用真实API
      const apiRequest = {
        image: imageUrl,
        effectId: effectIdFinal,
        effectName: effectNameFinal,
        generationType: 'video-effects'
      }

      const response = await fetch('/api/video/effects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 🔥 确保包含认证cookie
        body: JSON.stringify(apiRequest)
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle API errors
        if (data.code === 'AUTH_REQUIRED') {
          throw new Error('Authentication required')
        }
        // 🔥 API失败时，移除已创建的本地job
        videoContext.removeJob(job.id)
        throw new Error(data.error || `API error: ${response.status}`)
      }

      // 🔥 第1层防护：验证 requestId 是否存在
      if (!data.success || !data.data?.requestId) {
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      // 3. 更新任务状态为processing，这会自动触发轮询
      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId, // 🔥 保存积分预扣ID
        status: 'processing'
      })


      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false }))

      // 🔥 第3层防护：延迟回调，确保 React 状态更新完成
      queueMicrotask(() => {
        hookOptionsRef.current?.onSuccess?.(job.id, data.data.requestId)
      })

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('VideoGeneration: 视频特效失败:', errorMessage)

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))

      // 🔥 调用onError回调
      hookOptionsRef.current?.onError?.(errorMessage)

      throw error
    }
  }, [session?.user?.uuid, videoContext])

  // 🎯 取消生成
  const cancelGeneration = useCallback((jobId: string) => {

    // 移除任务和选项（轮询会因为任务不存在而自动停止）
    videoContext.removeJob(jobId)
    optionsRef.current.delete(jobId)
  }, [videoContext])

  // 🎯 重试任务
  const retryGeneration = useCallback(async (jobId: string): Promise<string> => {

    const job = videoContext.getJobById(jobId)
    if (!job) {
      throw new Error('Task not found')
    }

    // 重新创建任务
    const newJobId = await generateTextToVideo(
      job.prompt,
      job.settings as any,
      optionsRef.current.get(jobId)
    )

    // 移除旧任务
    videoContext.removeJob(jobId)
    optionsRef.current.delete(jobId)

    return newJobId
  }, [videoContext, generateTextToVideo])

  // 🎯 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // 🎯 获取任务状态
  const getTaskStatus = useCallback((jobId: string) => {
    return videoContext.getJobById(jobId)
  }, [videoContext])

  // 🎯 获取所有活跃任务
  const getActiveTasks = useCallback(() => {
    return videoContext.activeJobs
  }, [videoContext])

  return {
    // 状态
    ...state,

    // 生成方法
    generateTextToVideo,
    generateImageToVideo,
    generateVideoEffects,

    // 控制方法
    cancelGeneration,
    retryGeneration,
    clearError,

    // 查询方法
    getTaskStatus,
    getActiveTasks,

    // 兼容旧API的别名
    generateVideo: generateTextToVideo, // 🔥 修复：generateVideo应该是text-to-video的别名
    startGeneration: generateTextToVideo,
    startPolling: () => {
      console.warn('startPolling is deprecated, use generateTextToVideo instead')
    },
    stopPolling: cancelGeneration
  }
}

// 🎯 兼容性Hook（替代旧的use-video-polling）
export function useVideoPolling() {
  const generation = useVideoGeneration()

  // 返回兼容的API
  return {
    isPolling: generation.isGenerating,
    activeJobsCount: generation.activeJobs,
    error: generation.error,

    // 兼容方法（已废弃，但保持向后兼容）
    startPolling: () => {
      console.warn('useVideoPolling.startPolling is deprecated')
    },
    stopPolling: generation.cancelGeneration,

    // 新推荐的方法
    ...generation
  }
}
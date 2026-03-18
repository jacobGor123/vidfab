/**
 * 简化的视频生成Hook - 向后兼容版本
 * 使用旧Context，提供基本的视频生成功能
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useVideoContext } from '@/lib/contexts/video-context'
import { GenerationAnalytics, type GenerationType } from '@/lib/analytics/generation-events'
import type { VideoJob } from '@/lib/types/video'

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

interface UseVideoGenerationOptions {
  onSuccess?: (job: any, requestId: string) => void
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

  useEffect(() => {
    const activeJobsInProgress = videoContext.activeJobs.filter(job =>
      job.status === 'processing' || job.status === 'queued' || job.status === 'generating'
    )
    const activeJobs = activeJobsInProgress.length

    setState(prev => ({
      ...prev,
      activeJobs
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

  const generateTextToVideo = useCallback(async (
    prompt: string,
    settings: {
      model?: string
      duration?: number
      resolution?: string
      aspectRatio?: string
      style?: string
      generateAudio?: boolean
    } = {},
    options?: GenerationOptions
  ): Promise<string> => {
    if (!session?.user?.uuid) {
      throw new Error('Please sign in to access this feature')
    }

    setState(prev => ({ ...prev, isGenerating: true }))

    let job: VideoJob | undefined
    try {
      // 创建新任务
      job = videoContext.addJob({
        requestId: '', // 将在API调用后设置
        userId: session.user.uuid,
        prompt,
        generationType: 'text-to-video',  // 🔥 明确设置顶层 generationType
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
          style: settings.style || 'realistic',
          generateAudio: settings.generateAudio ?? false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        videoContext.removeJob(job.id)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (!data.data?.requestId) {
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing'
      })

      const updatedJob = {
        ...job,
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing' as const
      }

      // 🔥 重置生成状态
      setState(prev => ({ ...prev, isGenerating: false }))

      // 🔥 修复：直接传递完整的 job 对象，避免从 context 查找导致的竞态条件
      hookOptionsRef.current?.onSuccess?.(updatedJob, data.data.requestId)

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 清理失败的 job
      if (job) videoContext.removeJob(job.id)

      GenerationAnalytics.trackGenerationFailed({
        generationType: 'text-to-video',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: errorMessage,
        modelType: settings.model || 'vidfab-q1',
      })

      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      hookOptionsRef.current?.onError?.(errorMessage)

      throw error
    }
  }, [session?.user?.uuid, videoContext])

  const generateImageToVideo = useCallback(async (
    imageUrl: string,
    prompt: string = '',
    settings: {
      model?: string
      duration?: number
      resolution?: string
      aspectRatio?: string
      generateAudio?: boolean
    } = {},
    options?: GenerationOptions
  ): Promise<string> => {
    console.log('[DEBUG] generateImageToVideo called:', { imageUrl, prompt, settings })

    if (!session?.user?.uuid) {
      console.error('[DEBUG] No user session')
      throw new Error('Please sign in to access this feature')
    }

    console.log('[DEBUG] Setting isGenerating to true')
    setState(prev => ({ ...prev, isGenerating: true }))

    let job: VideoJob | undefined
    try {
      console.log('[DEBUG] Creating job via videoContext.addJob')

      job = videoContext.addJob({
        requestId: '',
        userId: session.user.uuid,
        prompt: prompt || 'Convert image to video',
        sourceImage: imageUrl,  // 🔥 添加 sourceImage 以触发正确的 generationType 推断
        generationType: 'image-to-video',  // 🔥 明确设置顶层 generationType
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

      console.log('[DEBUG] Job created:', { jobId: job.id, requestId: job.requestId })

      if (options) {
        optionsRef.current.set(job.id, options)
      }

      console.log('[DEBUG] Calling API /api/video/generate-image-to-video')

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
          aspectRatio: settings.aspectRatio || '16:9',
          generateAudio: settings.generateAudio ?? false
        })
      })

      console.log('[DEBUG] API response received, parsing JSON')

      const data = await response.json()

      console.log('[DEBUG] API response parsed:', { success: data.success, hasData: !!data.data, hasRequestId: !!data.data?.requestId })

      if (!response.ok) {
        console.error('[DEBUG] API failed:', response.status, data)
        videoContext.removeJob(job.id)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (!data.data?.requestId) {
        console.error('[DEBUG] API missing requestId:', data)
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      console.log('[DEBUG] Updating job with requestId:', {
        jobId: job.id,
        requestId: data.data.requestId,
        reservationId: data.data.reservationId
      })

      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing'
      })

      console.log('[DEBUG] Job updated, creating updatedJob object')

      const updatedJob = {
        ...job,
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing' as const
      }

      setState(prev => ({ ...prev, isGenerating: false }))

      console.log('[DEBUG] Calling onSuccess with updatedJob:', updatedJob)
      hookOptionsRef.current?.onSuccess?.(updatedJob, data.data.requestId)

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 清理失败的 job
      if (job) videoContext.removeJob(job.id)

      GenerationAnalytics.trackGenerationFailed({
        generationType: 'image-to-video',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: errorMessage,
        modelType: settings.model || 'vidfab-q1',
      })

      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      hookOptionsRef.current?.onError?.(errorMessage)

      throw error
    }
  }, [session?.user?.uuid, videoContext])

  const generateVideoEffects = useCallback(async (
    requestOrVideoUrl: string | { image: string; effectId: string; effectName?: string },
    effectId?: string,
    effectName?: string,
    options?: GenerationOptions
  ): Promise<string> => {
    if (!session?.user?.uuid) {
      const authError = 'Please sign in to access this feature'

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

    setState(prev => ({ ...prev, isGenerating: true }))

    let job: VideoJob | undefined
    try {
      // 1. 创建本地任务
      job = videoContext.addJob({
        requestId: '',
        userId: session.user.uuid,
        prompt: `${effectNameFinal || effectIdFinal} Effect`,
        settings: {
          generationType: 'video-effects',
          image: imageUrl,
          effectId: effectIdFinal,
          effectName: effectNameFinal || 'Unknown Effect'
        },
        generationType: 'video-effects',
        status: 'pending',
        progress: 0
      })

      if (options) {
        optionsRef.current.set(job.id, options)
      }

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
        credentials: 'include',
        body: JSON.stringify(apiRequest)
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle API errors
        if (data.code === 'AUTH_REQUIRED') {
          throw new Error('Authentication required')
        }
        videoContext.removeJob(job.id)
        throw new Error(data.error || `API error: ${response.status}`)
      }

      if (!data.success || !data.data?.requestId) {
        videoContext.removeJob(job.id)
        throw new Error('API response is missing requestId')
      }

      videoContext.updateJob(job.id, {
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing'
      })

      const updatedJob = {
        ...job,
        requestId: data.data.requestId,
        reservationId: data.data.reservationId,
        status: 'processing' as const
      }

      setState(prev => ({ ...prev, isGenerating: false }))

      hookOptionsRef.current?.onSuccess?.(updatedJob, data.data.requestId)

      return job.id

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 清理失败的 job
      if (job) videoContext.removeJob(job.id)

      GenerationAnalytics.trackGenerationFailed({
        generationType: 'video-effects',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: errorMessage,
        effectId: effectIdFinal,
        effectName: effectNameFinal,
      })

      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
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

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const getTaskStatus = useCallback((jobId: string) => {
    return videoContext.getJobById(jobId)
  }, [videoContext])

  const getActiveTasks = useCallback(() => {
    return videoContext.activeJobs
  }, [videoContext])

  return {
    ...state,

    generateTextToVideo,
    generateImageToVideo,
    generateVideoEffects,

    cancelGeneration,
    retryGeneration,
    clearError,

    getTaskStatus,
    getActiveTasks,

    generateVideo: generateTextToVideo,
    startGeneration: generateTextToVideo,
    startPolling: () => {},
    stopPolling: cancelGeneration
  }
}

export function useVideoPolling() {
  const generation = useVideoGeneration()

  return {
    isPolling: generation.isGenerating,
    activeJobsCount: generation.activeJobs,
    error: generation.error,

    startPolling: () => {},
    stopPolling: generation.cancelGeneration,

    ...generation
  }
}
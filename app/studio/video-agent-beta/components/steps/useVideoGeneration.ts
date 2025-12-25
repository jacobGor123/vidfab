/**
 * Step 4 Video Generation - Business Logic Hook
 * 处理视频生成的所有业务逻辑和状态管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'
import type { VideoAgentProject, VideoClip } from '@/lib/stores/video-agent'
import type { VideoGenerationState, VideoGenerationActions } from './Step4VideoGen.types'

interface UseVideoGenerationProps {
  project: VideoAgentProject
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onNext: () => void
}

export function useVideoGeneration({
  project,
  onUpdate,
  onNext
}: UseVideoGenerationProps) {
  const { getStoryboardsStatus, getVideosStatus, generateVideos, retryVideo } = useVideoAgentAPI()
  const debugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('va_debug')

  // 如果数据库有 video_clips，说明已开始过生成
  const hasExistingClips = Array.isArray(project.video_clips) && project.video_clips.length > 0

  const [isGenerating, setIsGenerating] = useState(false)
  const [hasStartedGeneration, setHasStartedGeneration] = useState(hasExistingClips)
  const [isInitializing, setIsInitializing] = useState(!hasExistingClips)
  const [videoClips, setVideoClips] = useState<VideoClip[]>(
    Array.isArray(project.video_clips) ? project.video_clips : []
  )
  const [error, setError] = useState<string | null>(null)
  const [retryingShot, setRetryingShot] = useState<number | null>(null)
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({})
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({})
  const [isShowingConfirm, setIsShowingConfirm] = useState(false)

  // 用于避免轮询返回相同数据仍触发重渲染
  const lastPollSignatureRef = useRef<string>('')
  // 使用 ref 存储最新的 isGenerating 状态，避免闭包问题
  const isGeneratingRef = useRef(isGenerating)

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  const totalShots = project.script_analysis?.shot_count || 0
  const completedShots = Array.isArray(videoClips)
    ? videoClips.filter((vc) => vc.status === 'success').length
    : 0
  const failedShots = Array.isArray(videoClips)
    ? videoClips.filter((vc) => vc.status === 'failed').length
    : 0
  const generatingShots = Array.isArray(videoClips)
    ? videoClips.filter((vc) => vc.status === 'generating').length
    : 0

  // 检查分镜图是否就绪
  const storyboardsReady = Boolean(
    project.storyboards &&
    Array.isArray(project.storyboards) &&
    project.storyboards.length > 0 &&
    project.storyboards.some((sb: any) => sb.status === 'success')
  )

  // 如果 storyboards 数据缺失，主动获取
  useEffect(() => {
    if (!project.storyboards || !Array.isArray(project.storyboards) || project.storyboards.length === 0) {
      // 主动获取分镜图状态
      getStoryboardsStatus(project.id)
        .then(data => {
          if (data && data.length > 0) {
            onUpdate({ storyboards: data })
          }
        })
        .catch(err => {
          console.error('[Step4] Failed to fetch storyboards:', err)
        })
    }
  }, [project.id, project.storyboards, getStoryboardsStatus, onUpdate])

  // 页面加载时，如果有正在生成的视频，自动开始轮询
  useEffect(() => {
    if (generatingShots > 0 && !isGenerating) {
      console.log('[Step4] Resuming polling for generating videos:', generatingShots)
      setIsGenerating(true)
    }
  }, []) // 只在组件挂载时执行一次

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const data = await getVideosStatus(project.id)

      console.log('[Step4 Frontend] Poll status received:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        statuses: Array.isArray(data) ? data.map((c: any) => ({ shot: c.shot_number, status: c.status, hasUrl: !!c.video_url })) : 'N/A'
      })

      // 轮询去重：只在关键字段变化时才更新 state/store
      const signature = Array.isArray(data)
        ? data
            .map((clip: any) => {
              const url = clip?.video_url || ''
              const err = clip?.error_message || ''
              return `${clip?.shot_number}:${clip?.status}:${url.length}:${err}`
            })
            .join('|')
        : ''

      console.log('[Step4 Frontend] Signature comparison:', {
        current: signature,
        last: lastPollSignatureRef.current,
        willUpdate: signature !== lastPollSignatureRef.current
      })

      if (signature && signature === lastPollSignatureRef.current) {
        console.log('[Step4 Frontend] Skipping update - signature unchanged')
        return
      }
      lastPollSignatureRef.current = signature

      if (debugEnabled) {
        console.log('[VA_DEBUG][Step4] Video clips status update:', {
          count: Array.isArray(data) ? data.length : 0,
          completed: Array.isArray(data) ? data.filter((c: any) => c.status === 'success').length : 0,
          generating: Array.isArray(data) ? data.filter((c: any) => c.status === 'generating').length : 0,
          failed: Array.isArray(data) ? data.filter((c: any) => c.status === 'failed').length : 0
        })
      }

      // 只有当返回数据不为空时才更新
      if (data && data.length > 0) {
        console.log('[Step4 Frontend] Updating videoClips state with', data.length, 'clips')
        setVideoClips(data)
        onUpdate({ video_clips: data })
      }

      // 检查是否有正在生成的视频
      const hasGenerating = data && data.some((vc: VideoClip) => vc.status === 'generating')

      console.log('[Step4 Frontend] Polling control check:', {
        hasGenerating,
        isCurrentlyGenerating: isGeneratingRef.current,
        action: hasGenerating && !isGeneratingRef.current ? 'START' :
                !hasGenerating && isGeneratingRef.current ? 'STOP' : 'NONE'
      })

      // 根据实际状态决定是否需要轮询（使用 ref 避免闭包问题）
      if (hasGenerating && !isGeneratingRef.current) {
        // 发现有 generating 状态但轮询已停止，重新启动轮询
        console.log('[Step4] Starting polling - found generating videos')
        setIsGenerating(true)
      } else if (!hasGenerating && isGeneratingRef.current) {
        // 没有 generating 状态但轮询还在运行，停止轮询
        console.log('[Step4] Stopping polling - all videos completed')
        setIsGenerating(false)
      }
    } catch (err) {
      console.error('Failed to poll video status:', err)
    }
  }, [project.id, onUpdate, debugEnabled, getVideosStatus])

  // 启动轮询 - 一旦开始生成就持续轮询，直到全部完成
  useEffect(() => {
    if (isGenerating) {
      // 立即轮询一次
      pollStatus()

      // 然后每2秒轮询一次
      const interval = setInterval(pollStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [isGenerating, pollStatus])

  // 自动开始生成
  useEffect(() => {
    if (!hasStartedGeneration && videoClips.length === 0 && !isGenerating && storyboardsReady) {
      if (debugEnabled) console.log('[VA_DEBUG][Step4] Auto-starting video generation (skip confirmation)')
      handleGenerate()
    }
  }, [hasStartedGeneration, videoClips.length, isGenerating, storyboardsReady])

  const handleGenerate = async () => {
    setIsInitializing(false)
    setIsGenerating(true)
    setHasStartedGeneration(true)
    setError(null)

    try {
      await generateVideos(project.id)
      // 开始轮询（useEffect 会自动触发）
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
      setHasStartedGeneration(false)
      setIsInitializing(true)
    }
  }

  const handleRetry = async (shotNumber: number) => {
    // 限制：如果已经有任务在进行中，阻止新任务
    if (retryingShot !== null) {
      showError('Please wait for the current regeneration to complete')
      return
    }

    setRetryingShot(shotNumber)
    setError(null)

    // 启动轮询（确保能看到生成进度）
    setIsGenerating(true)

    // 立即更新本地状态为 generating，显示动画
    setVideoClips((prev) =>
      prev.map((vc) =>
        vc.shot_number === shotNumber ? { ...vc, status: 'generating', error_message: null } : vc
      )
    )

    const dismissLoading = showLoading(`Regenerating video ${shotNumber}...`)
    try {
      // 获取自定义 prompt（如果用户修改过）
      const customPrompt = customPrompts[shotNumber]

      await retryVideo(project.id, {
        shotNumber,
        customPrompt: customPrompt || undefined
      })

      dismissLoading()

      showSuccess(`Video ${shotNumber} regeneration started`)
      // 轮询一次以确保数据同步
      pollStatus()
    } catch (err: any) {
      dismissLoading()
      setError(err.message)
      showError(err.message)

      // 失败时恢复为 failed 状态
      setVideoClips((prev) =>
        prev.map((vc) =>
          vc.shot_number === shotNumber
            ? { ...vc, status: 'failed', error_message: err.message }
            : vc
        )
      )
    } finally {
      setRetryingShot(null)
    }
  }

  // 获取默认 prompt
  const getDefaultPrompt = (shotNumber: number): string => {
    const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
    if (!shot) return ''
    return `${shot.description}. ${shot.character_action}`
  }

  // 切换 prompt 展开/收起
  const togglePromptExpand = (shotNumber: number) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [shotNumber]: !prev[shotNumber]
    }))
  }

  // 更新自定义 prompt
  const updateCustomPrompt = (shotNumber: number, prompt: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [shotNumber]: prompt
    }))
  }

  const handleConfirm = async () => {
    if (failedShots > 0) {
      const confirmed = await showConfirm(
        `${failedShots} videos failed. Continue anyway?`,
        {
          title: 'Videos Failed',
          confirmText: 'Continue',
          cancelText: 'Cancel'
        }
      )
      if (!confirmed) {
        return
      }
    }
    // 不需要手动更新 current_step，handleNext 会自动更新数据库
    onNext()
  }

  const state: VideoGenerationState = {
    isGenerating,
    hasStartedGeneration,
    isInitializing,
    videoClips,
    error,
    retryingShot,
    customPrompts,
    expandedPrompts,
    isShowingConfirm
  }

  const actions: VideoGenerationActions = {
    handleGenerate,
    handleRetry,
    handleConfirm,
    getDefaultPrompt,
    updateCustomPrompt,
    togglePromptExpand
  }

  const stats = {
    totalShots,
    completedShots,
    failedShots,
    generatingShots,
    progress: totalShots > 0 ? (completedShots / totalShots) * 100 : 0
  }

  return {
    state,
    actions,
    stats,
    storyboardsReady,
    setIsShowingConfirm
  }
}

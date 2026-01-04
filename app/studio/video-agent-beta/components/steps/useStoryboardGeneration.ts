/**
 * Step 3 Storyboard Generation - Business Logic Hook
 * 处理分镜图生成的所有业务逻辑和状态管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'
import type { VideoAgentProject, Storyboard } from '@/lib/stores/video-agent'
import type { StoryboardGenerationState, StoryboardGenerationActions } from './Step3StoryboardGen.types'

type StoryboardsStatusMeta = {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  total?: number
  success?: number
  generating?: number
  failed?: number
  allCompleted?: boolean
}

type StoryboardsStatusResponse = {
  data: Storyboard[]
  meta?: StoryboardsStatusMeta
}

interface UseStoryboardGenerationProps {
  project: VideoAgentProject
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onNext: () => void
}

export function useStoryboardGeneration({
  project,
  onUpdate,
  onNext
}: UseStoryboardGenerationProps) {
  const { getStoryboardsStatus, generateStoryboards, regenerateStoryboard } = useVideoAgentAPI()
  const debugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('va_debug')

  // 如果数据库有 storyboards，说明已开始过生成
  const hasExistingStoryboards = Array.isArray(project.storyboards) && project.storyboards.length > 0

  const [isGenerating, setIsGenerating] = useState(false)
  const [hasStartedGeneration, setHasStartedGeneration] = useState(hasExistingStoryboards)
  const [storyboards, setStoryboards] = useState<Storyboard[]>(
    Array.isArray(project.storyboards) ? project.storyboards : []
  )
  const [error, setError] = useState<string | null>(null)
  const [regeneratingShot, setRegeneratingShot] = useState<number | null>(null)
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({})
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({})
  const [isShowingConfirm, setIsShowingConfirm] = useState(false)
  const [statusMeta, setStatusMeta] = useState<StoryboardsStatusMeta | null>(null)

  // 用于避免轮询返回相同数据仍触发重渲染
  const lastPollSignatureRef = useRef<string>('')
  // 使用 ref 存储最新的 isGenerating 状态，避免闭包问题
  const isGeneratingRef = useRef(isGenerating)

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  const totalShots = project.script_analysis?.shot_count || 0
  const completedShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'success').length
    : 0
  const failedShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'failed').length
    : 0
  const generatingShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'generating').length
    : 0

  const effectiveTotalShots = statusMeta?.total ?? totalShots
  const effectiveCompletedShots = statusMeta?.success ?? completedShots
  const effectiveFailedShots = statusMeta?.failed ?? failedShots
  const effectiveGeneratingShots = statusMeta?.generating ?? generatingShots

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const res = await getStoryboardsStatus(project.id) as StoryboardsStatusResponse
      const data = res?.data
      const meta = res?.meta

      // ✅ 优化：使用 updated_at 时间戳检测变化（更可靠）
      const signature = Array.isArray(data)
        ? data
            .map((sb: any) => {
              return `${sb?.shot_number}:${sb?.updated_at || ''}`
            })
            .join('|')
        : ''

      if (signature && signature === lastPollSignatureRef.current) {
        return
      }
      lastPollSignatureRef.current = signature

      if (debugEnabled) {
        console.log('[VA_DEBUG][Step3] Storyboards status update:', {
          count: Array.isArray(data) ? data.length : 0,
          completed: Array.isArray(data) ? data.filter((s: any) => s.status === 'success').length : 0,
          generating: Array.isArray(data) ? data.filter((s: any) => s.status === 'generating').length : 0,
          failed: Array.isArray(data) ? data.filter((s: any) => s.status === 'failed').length : 0,
          meta
        })
      }

      // ✅ 总是更新状态（包括空数组）
      if (data) {
        setStoryboards(data)
        onUpdate({ storyboards: data })
      }

      if (meta) {
        setStatusMeta(meta)
      }

      // 检查是否有正在生成的分镜图
      const hasGenerating = data && data.some((sb: Storyboard) => sb.status === 'generating')

      // 根据实际状态决定是否需要轮询（使用 ref 避免闭包问题）
      if (hasGenerating && !isGeneratingRef.current) {
        // 发现有 generating 状态但轮询已停止，重新启动轮询
        console.log('[Step3] Starting polling - found generating storyboards')
        setIsGenerating(true)
      } else if (!hasGenerating && isGeneratingRef.current) {
        // 没有 generating 状态但轮询还在运行，停止轮询
        console.log('[Step3] Stopping polling - all storyboards completed')
        setIsGenerating(false)
      }
    } catch (err) {
      console.error('Failed to poll storyboard status:', err)
    }
  }, [project.id, onUpdate, debugEnabled, getStoryboardsStatus])

  // 页面加载时，如果有正在生成的分镜，自动开始轮询
  useEffect(() => {
    if (generatingShots > 0 && !isGenerating) {
      console.log('[Step3] Resuming polling for generating storyboards:', generatingShots)
      setIsGenerating(true)
    }
  }, []) // 只在组件挂载时执行一次

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

  // 自动开始生成（删除确认步骤）
  useEffect(() => {
    if (!hasStartedGeneration && storyboards.length === 0 && !isGenerating) {
      if (debugEnabled) console.log('[VA_DEBUG][Step3] Auto-starting storyboard generation (skip confirmation)')
      handleGenerate()
    }
  }, [hasStartedGeneration, storyboards.length, isGenerating])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setHasStartedGeneration(true) // 标记已开始生成
    setError(null)

    try {
      await generateStoryboards(project.id)
      // ✅ 立即轮询一次，获取刚创建的 generating 记录
      await pollStatus()
      // 后续轮询由 useEffect 自动触发
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
      // 🔥 避免无限重试/重复触发：失败后不要重置 hasStartedGeneration
      // 否则自动启动 useEffect 会再次触发 generate 接口，导致重复初始化/重复任务。
    }
  }

  const handleRegenerate = async (shotNumber: number) => {
    // 限制：如果已经有任务在进行中，阻止新任务
    if (regeneratingShot !== null) {
      showError('Please wait for the current regeneration to complete')
      return
    }

    // 验证 project.id 存在
    if (!project?.id) {
      console.error('[Step3] Cannot regenerate: project.id is missing', { project })
      showError('Project ID is missing. Please refresh the page.')
      return
    }

    console.log('[Step3] Starting regeneration', {
      projectId: project.id,
      shotNumber,
      hasCustomPrompt: !!customPrompts[shotNumber]
    })

    setRegeneratingShot(shotNumber)
    setError(null)

    // 启动轮询（确保能看到生成进度）
    setIsGenerating(true)

    // 立即更新本地状态为 generating，显示动画
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.shot_number === shotNumber ? { ...sb, status: 'generating' } : sb
      )
    )

    const dismissLoading = showLoading(`Regenerating storyboard ${shotNumber}...`)
    try {
      // 获取自定义 prompt（如果用户修改过）
      const customPrompt = customPrompts[shotNumber]

      console.log('[Step3] Calling regenerateStoryboard API', {
        projectId: project.id,
        shotNumber,
        customPrompt: customPrompt ? customPrompt.substring(0, 50) + '...' : undefined
      })

      await regenerateStoryboard(project.id, {
        shotNumber,
        customPrompt: customPrompt || undefined
      })

      dismissLoading()

      showSuccess(`Storyboard ${shotNumber} regenerated successfully`)
      // 轮询一次以确保数据同步
      pollStatus()
    } catch (err: any) {
      dismissLoading()
      setError(err.message)
      showError(err.message)

      // 失败时恢复为 failed 状态
      setStoryboards((prev) =>
        prev.map((sb) =>
          sb.shot_number === shotNumber
            ? { ...sb, status: 'failed', error_message: err.message }
            : sb
        )
      )
    } finally {
      setRegeneratingShot(null)
    }
  }

  const handleConfirm = async () => {
    if (failedShots > 0) {
      const confirmed = await showConfirm(
        `${failedShots} storyboards failed. Continue anyway?`,
        {
          title: 'Storyboards Failed',
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

  // 获取默认 prompt（description + character_action）
  const getDefaultPrompt = (shotNumber: number): string => {
    const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
    if (!shot) return ''
    return shot.description || ''
  }

  // 更新自定义 prompt
  const updateCustomPrompt = (shotNumber: number, prompt: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [shotNumber]: prompt
    }))
  }

  // 切换 prompt 展开/收起
  const togglePromptExpand = (shotNumber: number) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [shotNumber]: !prev[shotNumber]
    }))
  }

  const state: StoryboardGenerationState = {
    isGenerating,
    hasStartedGeneration,
    storyboards,
    error,
    regeneratingShot,
    customPrompts,
    expandedPrompts,
    isShowingConfirm,
    statusMeta
  }

  const actions: StoryboardGenerationActions = {
    handleGenerate,
    handleRegenerate,
    handleConfirm,
    getDefaultPrompt,
    updateCustomPrompt,
    togglePromptExpand
  }

  const stats = {
    totalShots: effectiveTotalShots,
    completedShots: effectiveCompletedShots,
    failedShots: effectiveFailedShots,
    generatingShots: effectiveGeneratingShots,
    progress: effectiveTotalShots > 0 ? (effectiveCompletedShots / effectiveTotalShots) * 100 : 0
  }

  return {
    state,
    actions,
    stats,
    setIsShowingConfirm
  }
}

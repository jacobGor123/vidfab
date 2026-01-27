/**
 * Step 3 Storyboard Generation - Business Logic Hook
 * 处理分镜图生成的所有业务逻辑和状态管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'
import type { VideoAgentProject, Storyboard } from '@/lib/stores/video-agent'
import type { StoryboardGenerationState, StoryboardGenerationActions } from './Step3StoryboardGen.types'

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
  const { getStoryboardsStatus, generateStoryboards, regenerateStoryboard, deleteShot } = useVideoAgentAPI()
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
  const [deletingShot, setDeletingShot] = useState<number | null>(null)
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
  const completedShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'success').length
    : 0
  const failedShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'failed').length
    : 0
  const generatingShots = Array.isArray(storyboards)
    ? storyboards.filter((sb) => sb.status === 'generating').length
    : 0

  // 用于延迟停止轮询（确保最后一次状态更新已渲染）
  const stopPollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep a stable onUpdate ref; parent often passes inline closures.
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const data = await getStoryboardsStatus(project.id)

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
      // Update the signature before state updates so downstream guards can reuse it.
      lastPollSignatureRef.current = signature

      if (debugEnabled) {
        console.log('[VA_DEBUG][Step3] Storyboards status update:', {
          count: Array.isArray(data) ? data.length : 0,
          completed: Array.isArray(data) ? data.filter((s: any) => s.status === 'success').length : 0,
          generating: Array.isArray(data) ? data.filter((s: any) => s.status === 'generating').length : 0,
          failed: Array.isArray(data) ? data.filter((s: any) => s.status === 'failed').length : 0
        })
      }

      // ✅ 总是更新状态（包括空数组），但要避免无变化的重复更新
      if (data) {
        // signature already includes updated_at; if identical, keep previous reference.
        setStoryboards(data)
        onUpdateRef.current({ storyboards: data })
      }

      // 检查是否有正在生成的分镜图
      const hasGenerating = data && data.some((sb: Storyboard) => sb.status === 'generating')

      // 根据实际状态决定是否需要轮询（使用 ref 避免闭包问题）
      if (hasGenerating && !isGeneratingRef.current) {
        // 发现有 generating 状态但轮询已停止，重新启动轮询
        console.log('[Step3] Starting polling - found generating storyboards')
        // 清除可能存在的停止定时器
        if (stopPollTimeoutRef.current) {
          clearTimeout(stopPollTimeoutRef.current)
          stopPollTimeoutRef.current = null
        }
        setIsGenerating(true)
      } else if (!hasGenerating && isGeneratingRef.current) {
        // 🔥 修复：没有 generating 状态时，立即停止轮询
        // 不再延迟，立即显示按钮
        console.log('[Step3] ✅ Stopping polling - all storyboards completed')
        setIsGenerating(false)
        // 清除可能存在的停止定时器
        if (stopPollTimeoutRef.current) {
          clearTimeout(stopPollTimeoutRef.current)
          stopPollTimeoutRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to poll storyboard status:', err)
    }
  }, [project.id, debugEnabled, getStoryboardsStatus])

  // 页面加载时，如果有正在生成的分镜，自动开始轮询（恢复未完成的任务）
  // 🔥 如果从未开始过生成，也自动开始（移除二次确认界面）
  useEffect(() => {
    if (generatingShots > 0 && !isGenerating) {
      console.log('[Step3] Resuming polling for generating storyboards:', generatingShots)
      setIsGenerating(true)
      setHasStartedGeneration(true)  // 🔥 标记已开始生成，避免显示初始界面
    } else if (!hasStartedGeneration && !isGenerating && storyboards.length === 0) {
      // 🔥 首次进入 Step 3，自动开始生成（无需用户再次点击）
      console.log('[Step3] Auto-starting storyboard generation on first visit')
      handleGenerate()
    }
  }, []) // 只在组件挂载时执行一次

  // 启动轮询 - 一旦开始生成就持续轮询，直到全部完成
  useEffect(() => {
    if (isGenerating) {
      // 立即轮询一次
      pollStatus()

      // 然后每2秒轮询一次
      const interval = setInterval(pollStatus, 2000)
      return () => {
        clearInterval(interval)
        // 清理停止定时器
        if (stopPollTimeoutRef.current) {
          clearTimeout(stopPollTimeoutRef.current)
          stopPollTimeoutRef.current = null
        }
      }
    }
  }, [isGenerating, pollStatus])

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
      setHasStartedGeneration(false)
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

      // 🔥 尝试解析 customPrompt，如果是JSON则提取字段更新
      let fieldsUpdate: any = undefined
      if (customPrompt) {
        try {
          const parsed = JSON.parse(customPrompt)
          if (parsed && typeof parsed === 'object') {
            // 🔥 只包含有值的字段，过滤掉 undefined
            fieldsUpdate = {}
            if (parsed.description) fieldsUpdate.description = parsed.description
            if (parsed.camera_angle) fieldsUpdate.camera_angle = parsed.camera_angle
            if (parsed.character_action) fieldsUpdate.character_action = parsed.character_action
            if (parsed.mood) fieldsUpdate.mood = parsed.mood

            // 如果没有任何字段，设置为 undefined
            if (Object.keys(fieldsUpdate).length === 0) {
              fieldsUpdate = undefined
            }
          }
        } catch {
          // 不是JSON，忽略
        }
      }

      console.log('[Step3] Calling regenerateStoryboard API', {
        projectId: project.id,
        shotNumber,
        customPrompt: customPrompt ? customPrompt.substring(0, 50) + '...' : undefined,
        fieldsUpdate: fieldsUpdate ? 'yes' : 'no'
      })

      await regenerateStoryboard(project.id, {
        shotNumber,
        customPrompt: customPrompt || undefined,
        fieldsUpdate: fieldsUpdate  // 🔥 传递字段更新
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

  const handleDelete = async (shotNumber: number) => {
    if (!project.script_analysis || deletingShot !== null) {
      return
    }

    // 如果只剩一个分镜，不允许删除
    if (project.script_analysis.shots.length === 1) {
      showError('Cannot delete the last shot. At least one shot is required.')
      return
    }

    // 显示确认对话框
    const confirmed = await showConfirm(
      `This will delete Shot ${shotNumber} and all related storyboards and videos. This action cannot be undone.`,
      {
        title: 'Delete Shot',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )

    if (!confirmed) {
      return
    }

    setDeletingShot(shotNumber)
    setError(null)

    const dismissLoading = showLoading(`Deleting shot ${shotNumber}...`)
    try {
      // 调用删除 API
      const result = await deleteShot(project.id, shotNumber)

      console.log('[Step3] Shot deleted:', result)

      // 🔥 重新获取完整的项目数据，因为后端已经重新计算了 duration 和 time_range
      const response = await fetch(`/api/video-agent/projects/${project.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch updated project data')
      }

      const { data: updatedProject } = await response.json()
      const updatedScriptAnalysis = updatedProject.script_analysis

      onUpdate({
        script_analysis: updatedScriptAnalysis
      })

      // 🔥 立即轮询获取最新的 storyboards 状态（后端已经删除并重新编号了）
      await pollStatus()

      // 清除所有编辑状态（因为 shot_number 已经改变）
      setCustomPrompts({})
      setExpandedPrompts({})

      dismissLoading()
      showSuccess(`Shot ${shotNumber} deleted successfully`)

      console.log('[Step3] Local state updated after deletion, storyboards synced from database')
    } catch (err: any) {
      dismissLoading()
      setError(err.message || 'Failed to delete shot')
      showError(err.message || 'Failed to delete shot')
      console.error('[Step3] Delete shot failed:', err)
    } finally {
      setDeletingShot(null)
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

  // 获取默认 prompt（只显示 description，用户修改后会作为新的 description）
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
    deletingShot,
    customPrompts,
    expandedPrompts,
    isShowingConfirm
  }

  const actions: StoryboardGenerationActions = {
    handleGenerate,
    handleRegenerate,
    handleDelete,
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
    setIsShowingConfirm
  }
}

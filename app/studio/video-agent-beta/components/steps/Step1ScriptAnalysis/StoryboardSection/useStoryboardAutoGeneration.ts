/**
 * useStoryboardAutoGeneration Hook
 *
 * 自动触发分镜图批量生成，并轮询获取生成状态
 *
 * 核心功能：
 * 1. 自动调用 generateStoryboards API
 * 2. 轮询 getStoryboardsStatus 获取生成进度
 * 3. 防止重复触发
 * 4. 支持重试
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import type { VideoAgentProject, ScriptAnalysis, Storyboard } from '@/lib/stores/video-agent'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

interface UseStoryboardAutoGenerationReturn {
  status: GenerationStatus
  progress: { current: number; total: number }
  storyboards: Record<number, Storyboard>
  startGeneration: () => Promise<void>
  retryGeneration: () => Promise<void>
  refresh: () => Promise<void>  // 🔥 新增
}

export function useStoryboardAutoGeneration(
  project: VideoAgentProject,
  analysis: ScriptAnalysis
): UseStoryboardAutoGenerationReturn {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [storyboards, setStoryboards] = useState<Record<number, Storyboard>>({})

  const { generateStoryboards, getStoryboardsStatus } = useVideoAgentAPI()

  // 防止重复触发
  const hasStartedRef = useRef(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef(0) // 🔥 追踪连续错误次数
  const MAX_ERRORS = 3 // 🔥 最大允许连续错误次数

  // 🔥 同步 project.storyboards 到内部状态（处理 Edit Dialog 重新生成后的更新）
  useEffect(() => {
    if (!project.storyboards || project.storyboards.length === 0) return

    // 将 project.storyboards 转换为 Record 格式
    const projectStoryboardMap: Record<number, Storyboard> = {}
    project.storyboards.forEach(sb => {
      projectStoryboardMap[sb.shot_number] = {
        id: sb.id,
        shot_number: sb.shot_number,
        image_url: sb.image_url,
        status: sb.status,
        error_message: sb.error_message,
        generation_attempts: sb.generation_attempts || 0
      }
    })

    // 合并更新，保留最新的图片
    setStoryboards(prev => {
      const merged = { ...prev }
      Object.entries(projectStoryboardMap).forEach(([key, value]) => {
        const shotNum = parseInt(key)
        // 如果 project 中有更新的图片，使用它
        if (value.image_url) {
          merged[shotNum] = value
        }
      })
      return merged
    })
  }, [project.storyboards])

  // 追踪轮询开始时间，用于超时保护
  const pollStartTimeRef = useRef<number | null>(null)
  const POLL_TIMEOUT_MS = 900000 // 15 分钟超时（支持大量分镜图生成）

  // 清理轮询
  const clearPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    pollStartTimeRef.current = null
    errorCountRef.current = 0
  }, [])

  // 轮询获取分镜状态
  const pollStoryboards = useCallback(async () => {
    try {
      // 检查超时
      if (pollStartTimeRef.current) {
        const elapsed = Date.now() - pollStartTimeRef.current
        if (elapsed > POLL_TIMEOUT_MS) {
          console.warn('[StoryboardAutoGen] Polling timeout, stopping...')
          clearPoll()
          setStatus('completed') // 超时后认为已完成（可能部分成功）
          return
        }
      }

      const statusData = await getStoryboardsStatus(project.id)

      // 成功获取数据，重置错误计数
      errorCountRef.current = 0

      if (!statusData || !Array.isArray(statusData)) {
        console.warn('[StoryboardAutoGen] Invalid status data:', statusData)
        return
      }

      // 更新分镜数据 - 构建 Record<number, Storyboard>
      const storyboardMap: Record<number, Storyboard> = {}
      statusData.forEach((item: any) => {
        if (item.shot_number) {
          storyboardMap[item.shot_number] = {
            id: item.id,
            shot_number: item.shot_number,
            image_url: item.image_url,
            status: item.status,
            error_message: item.error_message,
            generation_attempts: item.generation_attempts || 0
          }
        }
      })
      setStoryboards(storyboardMap)

      // 计算完成进度 - 检查有多少分镜已经成功生成
      const completed = statusData.filter(
        (s: any) => s.status === 'success' && s.image_url
      ).length
      const failed = statusData.filter(
        (s: any) => s.status === 'failed'
      ).length
      const generating = statusData.filter(
        (s: any) => s.status === 'generating'
      ).length
      const total = analysis.shot_count

      setProgress({ current: completed, total })

      // 检查是否全部完成（包括失败的分镜图）
      // 只有当没有任何分镜还在生成中时才停止轮询
      if (generating === 0) {
        clearPoll()
        if (completed === total) {
          setStatus('completed')
        } else if (failed > 0) {
          setStatus('completed') // 有失败的也认为完成，用户可以重新生成
        } else if (statusData.length === 0) {
          // 数据为空，可能需要重新生成
          setStatus('idle')
        } else {
          setStatus('completed')
        }
      }
    } catch (error: any) {
      console.error('[StoryboardAutoGen] Poll failed:', error)

      // 增加错误计数
      errorCountRef.current += 1

      // 如果连续错误过多，停止轮询
      if (errorCountRef.current >= MAX_ERRORS) {
        console.error('[StoryboardAutoGen] Too many errors, stopping poll')
        clearPoll()
        setStatus('failed')
      }
    }
  }, [project.id, analysis.shot_count, getStoryboardsStatus, clearPoll])

  // 开始生成
  const startGeneration = useCallback(async () => {
    if (hasStartedRef.current) {
      return
    }

    hasStartedRef.current = true
    setStatus('generating')
    setProgress({ current: 0, total: analysis.shot_count })

    try {
      // 调用批量生成 API
      await generateStoryboards(project.id, {
        imageStyle: project.image_style_id || 'realistic'
      })

      // 设置轮询开始时间，用于超时保护
      pollStartTimeRef.current = Date.now()

      // 开始轮询（每 2 秒一次）
      pollIntervalRef.current = setInterval(pollStoryboards, 2000)

      // 立即执行一次轮询
      await pollStoryboards()

    } catch (error) {
      console.error('[StoryboardAutoGen] Failed to start generation:', error)
      setStatus('failed')
      hasStartedRef.current = false
      clearPoll()
    }
  }, [
    project.id,
    project.image_style_id,
    analysis.shot_count,
    generateStoryboards,
    pollStoryboards,
    clearPoll
  ])

  // 重试生成
  const retryGeneration = useCallback(async () => {
    hasStartedRef.current = false
    clearPoll()
    await startGeneration()
  }, [startGeneration, clearPoll])

  // 🔥 手动刷新分镜数据（用于重新生成后刷新）
  const refresh = useCallback(async () => {
    await pollStoryboards()
  }, [pollStoryboards])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearPoll()
    }
  }, [clearPoll])

  return {
    status,
    progress,
    storyboards,
    startGeneration,
    retryGeneration,
    refresh  // 🔥 新增
  }
}

/**
 * useCharacterAutoGeneration Hook
 *
 * 自动触发人物图批量生成，并轮询获取生成状态
 *
 * 核心功能：
 * 1. 自动调用 batchGenerateCharacters API
 * 2. 轮询 getCharacters 获取生成进度
 * 3. 防止重复触发
 * 4. 支持重试
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import type { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'

// 数据库中的 project_characters 表结构
interface ProjectCharacter {
  id: string
  project_id: string
  character_name: string
  source: string
  template_id: string | null
  generation_prompt: string | null
  negative_prompt: string | null
  created_at: string
  updated_at: string
  character_reference_images?: Array<{
    image_url: string
    image_order: number
  }>
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

interface UseCharacterAutoGenerationReturn {
  status: GenerationStatus
  progress: { current: number; total: number }
  characters: ProjectCharacter[]
  startGeneration: () => Promise<void>
  retryGeneration: () => Promise<void>
}

export function useCharacterAutoGeneration(
  project: VideoAgentProject,
  analysis: ScriptAnalysis
): UseCharacterAutoGenerationReturn {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [characters, setCharacters] = useState<ProjectCharacter[]>((project.characters as unknown as ProjectCharacter[]) || [])

  const { generateCharacterPrompts, batchGenerateCharacters, getCharacters } = useVideoAgentAPI()

  // 防止重复触发
  const hasStartedRef = useRef(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef(0) // 🔥 追踪连续错误次数
  const MAX_ERRORS = 3 // 🔥 最大允许连续错误次数

  // 清理轮询
  const clearPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    errorCountRef.current = 0
  }, [])

  // 轮询获取人物数据
  const pollCharacters = useCallback(async () => {
    try {
      const updatedCharacters = await getCharacters(project.id) as unknown as ProjectCharacter[]

      // 🔥 成功获取数据，重置错误计数
      errorCountRef.current = 0

      setCharacters(updatedCharacters)

      // 计算完成进度 - 检查是否有参考图
      const completed = updatedCharacters.filter(c =>
        c.character_reference_images && c.character_reference_images.length > 0
      ).length
      const total = analysis.characters.length

      setProgress({ current: completed, total })

      // 检查是否全部完成
      if (completed === total) {
        clearPoll()
        setStatus('completed')
      }
    } catch (error: any) {
      console.error('[CharacterAutoGen] Poll failed:', error)

      // 🔥 增加错误计数
      errorCountRef.current += 1

      // 🔥 如果连续错误过多，停止轮询
      if (errorCountRef.current >= MAX_ERRORS) {
        console.error('[CharacterAutoGen] Too many errors, stopping poll')
        clearPoll()
        setStatus('failed')
      }
    }
  }, [project.id, analysis.characters.length, getCharacters, clearPoll])

  // 开始生成
  const startGeneration = useCallback(async () => {
    if (hasStartedRef.current) {
      console.log('[CharacterAutoGen] Already started, skipping')
      return
    }

    hasStartedRef.current = true
    setStatus('generating')
    setProgress({ current: 0, total: analysis.characters.length })

    try {
      console.log('[CharacterAutoGen] Step 1: Generating character prompts...')

      // 步骤 1: 生成所有人物的 prompts
      const promptsData = await generateCharacterPrompts(project.id, {
        imageStyle: project.image_style_id || 'realistic'
      } as any)
      const { characterPrompts } = promptsData as unknown as { characterPrompts: Array<{
        characterName: string
        prompt: string
        negativePrompt: string
      }> }

      console.log('[CharacterAutoGen] Prompts generated:', characterPrompts.length)

      // 步骤 2: 批量生成人物图片
      console.log('[CharacterAutoGen] Step 2: Starting batch image generation...')
      await batchGenerateCharacters(project.id, { characterPrompts } as any)

      console.log('[CharacterAutoGen] Batch generation started, polling for status...')

      // 开始轮询（每 2 秒一次）
      pollIntervalRef.current = setInterval(pollCharacters, 2000)

      // 立即执行一次轮询
      await pollCharacters()

    } catch (error) {
      console.error('[CharacterAutoGen] Failed to start generation:', error)
      setStatus('failed')
      hasStartedRef.current = false
      clearPoll()
    }
  }, [
    project.id,
    project.image_style_id,
    analysis.characters.length,
    generateCharacterPrompts,
    batchGenerateCharacters,
    pollCharacters,
    clearPoll
  ])

  // 重试生成
  const retryGeneration = useCallback(async () => {
    hasStartedRef.current = false
    clearPoll()
    await startGeneration()
  }, [startGeneration, clearPoll])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearPoll()
    }
  }, [clearPoll])

  return {
    status,
    progress,
    characters,
    startGeneration,
    retryGeneration
  }
}

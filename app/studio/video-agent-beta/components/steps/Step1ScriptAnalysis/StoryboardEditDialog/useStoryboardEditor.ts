/**
 * useStoryboardEditor Hook
 *
 * 管理分镜编辑弹框的状态和逻辑
 *
 * 核心功能：
 * 1. 自动选中该分镜涉及的人物
 * 2. 管理人物选择状态
 * 3. 管理 prompt 编辑
 * 4. 处理重新生成
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { VideoAgentProject } from '@/lib/stores/video-agent'

interface UseStoryboardEditorReturn {
  selectedCharacterNames: string[]
  editedPrompt: string
  isRegenerating: boolean
  handleToggleCharacter: (characterName: string) => void
  handlePromptChange: (prompt: string) => void
  handleRegenerate: (
    onRegenerate: (shotNumber: number, prompt: string, characterNames: string[]) => Promise<void>,
    onClose: () => void
  ) => Promise<void>
}

export function useStoryboardEditor(
  project: VideoAgentProject,
  shotNumber: number | null
): UseStoryboardEditorReturn {
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  // 🔥 追踪上次初始化的 shotNumber，避免重复初始化
  const lastInitializedShotRef = useRef<number | null>(null)

  // 🔥 关键修复：只在 shotNumber 变化时初始化，不依赖 project 对象
  useEffect(() => {
    // 对话框关闭时重置
    if (!shotNumber) {
      lastInitializedShotRef.current = null
      setSelectedCharacterNames([])
      setEditedPrompt('')
      return
    }

    // 已经初始化过这个 shot，跳过
    if (lastInitializedShotRef.current === shotNumber) {
      return
    }

    // 直接使用传入的 project，不放入依赖数组
    if (!project.script_analysis) {
      return
    }

    const shot = project.script_analysis.shots.find(s => s.shot_number === shotNumber)
    if (!shot) {
      return
    }

    console.log('[StoryboardEditor] Initializing for shot', shotNumber, {
      characters: shot.characters,
      description: shot.description
    })

    // 自动选中该分镜涉及的人物
    setSelectedCharacterNames(shot.characters || [])

    // 预填充 prompt
    const storyboard = project.storyboards?.find(s => s.shot_number === shotNumber)
    if (storyboard && 'prompt' in storyboard && storyboard.prompt) {
      setEditedPrompt(storyboard.prompt as string)
    } else {
      setEditedPrompt(shot.description)
    }

    // 标记已初始化
    lastInitializedShotRef.current = shotNumber
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotNumber]) // 🔥 只依赖 shotNumber

  // 切换人物选择
  const handleToggleCharacter = useCallback((characterName: string) => {
    setSelectedCharacterNames(prev => {
      if (prev.includes(characterName)) {
        return prev.filter(n => n !== characterName)
      } else {
        return [...prev, characterName]
      }
    })
  }, [])

  // 修改 prompt
  const handlePromptChange = useCallback((prompt: string) => {
    setEditedPrompt(prompt)
  }, [])

  // 重新生成
  const handleRegenerate = useCallback(async (
    onRegenerate: (shotNumber: number, prompt: string, characterNames: string[]) => Promise<void>,
    onClose: () => void
  ) => {
    if (!shotNumber) {
      console.warn('[StoryboardEditor] Cannot regenerate: shotNumber is null')
      return
    }

    setIsRegenerating(true)
    try {
      console.log('[StoryboardEditor] Regenerating shot', shotNumber, {
        prompt: editedPrompt,
        characters: selectedCharacterNames
      })

      await onRegenerate(shotNumber, editedPrompt, selectedCharacterNames)

      // 成功后关闭弹框
      onClose()
    } catch (error) {
      console.error('[StoryboardEditor] Regenerate failed:', error)
      // 错误处理由父组件负责（通过 toast 等）
    } finally {
      setIsRegenerating(false)
    }
  }, [shotNumber, editedPrompt, selectedCharacterNames])

  return {
    selectedCharacterNames,
    editedPrompt,
    isRegenerating,
    handleToggleCharacter,
    handlePromptChange,
    handleRegenerate
  }
}

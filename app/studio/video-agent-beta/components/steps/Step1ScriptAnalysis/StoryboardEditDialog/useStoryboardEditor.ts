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
  selectedCharacterIds: string[]
  editedPrompt: string
  isRegenerating: boolean
  handleToggleCharacter: (characterName: string) => void
  handleToggleCharacterId: (characterId: string) => void
  handlePromptChange: (prompt: string) => void
  handleRegenerate: (
    onRegenerate: (shotNumber: number, prompt: string, characterNames: string[], characterIds: string[]) => Promise<void>
  ) => Promise<void>
}

export function useStoryboardEditor(
  project: VideoAgentProject,
  shotNumber: number | null
): UseStoryboardEditorReturn {
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  // 🔥 追踪上次初始化的 shotNumber，避免重复初始化
  const lastInitializedShotRef = useRef<number | null>(null)

  // 🔥 初始化策略：shotNumber 变化时初始化；同时当 project.characters 更新时
  // 纠正 selectedCharacterIds（避免 Step2 变更后引用图仍是旧的）。
  useEffect(() => {
    // 对话框关闭时重置
    if (!shotNumber) {
      lastInitializedShotRef.current = null
      setSelectedCharacterNames([])
      setSelectedCharacterIds([])
      setEditedPrompt('')
      return
    }

    // 已经初始化过这个 shot，跳过
    if (lastInitializedShotRef.current === shotNumber) {
      return
    }

    // 直接使用传入的 project，不放入依赖数组
    if (!project.script_analysis || !Array.isArray(project.script_analysis.shots)) {
      return
    }

    const shot = project.script_analysis.shots.find(s => s.shot_number === shotNumber)
    if (!shot) {
      return
    }

    const normalize = (name: string) => name.split('(')[0].trim().toLowerCase()
    const projectChars = Array.isArray(project.characters) ? project.characters : []

    // 🔥 Debug: 打印原始数据
    console.log('[StoryboardEditor] 🔍 Initializing character selection for shot', {
      shotNumber,
      shotCharacters: shot.characters,
      shotDescription: shot.description?.substring(0, 100),
      projectCharactersCount: projectChars.length,
      projectCharacters: projectChars.map((c: any) => ({
        id: c.id,
        name: c.character_name || c.name
      }))
    })

    // 1) Name selection is used only for UI labels / legacy fallback.
    setSelectedCharacterNames((shot.characters || []).map((n: string) => normalize(String(n))).filter(Boolean))

    // 2) Id selection is the source of truth for reference images.
    const nameToId = new Map<string, string>()
    const idToName = new Map<string, string>()
    projectChars.forEach((c: any) => {
      if (!c?.id) return
      const name = String(c.character_name || c.name || '').trim()
      if (!name) return
      const normalizedName = normalize(name)
      nameToId.set(normalizedName, String(c.id))
      idToName.set(String(c.id), name)
      console.log('[StoryboardEditor] 🗺️  Mapping:', { original: name, normalized: normalizedName, id: c.id })
    })

    const mappedIds = (shot.characters || [])
      .map((n: string) => {
        const normalized = normalize(String(n))
        const id = nameToId.get(normalized)
        console.log('[StoryboardEditor] 🔄 Mapping shot character:', { original: n, normalized, foundId: id })
        return id
      })
      .filter(Boolean) as string[]

    // 🔥 修复：不再 fallback 到全选，如果映射失败就保持空数组
    console.log('[StoryboardEditor] ✅ Mapping result:', {
      inputCount: shot.characters?.length || 0,
      mappedCount: mappedIds.length,
      mappedIds
    })

    // 如果映射失败，记录日志便于调试
    if (mappedIds.length === 0 && shot.characters && shot.characters.length > 0) {
      console.warn('[StoryboardEditor] ⚠️  Character name mapping failed for shot', {
        shotNumber,
        shotCharacters: shot.characters,
        availableCharacters: projectChars.map((c: any) => ({
          id: c.id,
          name: c.character_name || c.name
        }))
      })
    }

    setSelectedCharacterIds(mappedIds)

    // Keep the display names in sync with ids so the panel doesn't show stale labels.
    const nextNames = mappedIds
      .map((id) => idToName.get(id))
      .filter(Boolean) as string[]
    if (nextNames.length > 0) setSelectedCharacterNames(nextNames)

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
  }, [shotNumber, project.characters])

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

  const handleToggleCharacterId = useCallback((characterId: string) => {
    setSelectedCharacterIds(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId)
      }
      return [...prev, characterId]
    })

    // Keep name-selection roughly in sync so any legacy name-based fallback remains sane.
    const idToName = new Map<string, string>()
    ;(project.characters || []).forEach((c: any) => {
      if (!c?.id) return
      const name = c.character_name || c.name
      if (name) idToName.set(String(c.id), String(name))
    })

    setSelectedCharacterNames(prev => {
      const mappedName = idToName.get(characterId)
      if (!mappedName) return prev
      if (prev.includes(mappedName)) return prev.filter(n => n !== mappedName)
      return [...prev, mappedName]
    })
  }, [project.characters])

  // 修改 prompt
  const handlePromptChange = useCallback((prompt: string) => {
    setEditedPrompt(prompt)
  }, [])

  // 重新生成
  const handleRegenerate = useCallback(async (
    onRegenerate: (shotNumber: number, prompt: string, characterNames: string[], characterIds: string[]) => Promise<void>
  ) => {
    if (!shotNumber) {
      console.warn('[StoryboardEditor] Cannot regenerate: shotNumber is null')
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerate(shotNumber, editedPrompt, selectedCharacterNames, selectedCharacterIds)

      // 🔥 不自动关闭弹框，让用户看到新生成的图片
      // 用户可以查看结果后自己决定是否关闭
    } catch (error) {
      console.error('[StoryboardEditor] Regenerate failed:', error)
      // 错误处理由父组件负责（通过 toast 等）
    } finally {
      setIsRegenerating(false)
    }
  }, [shotNumber, editedPrompt, selectedCharacterNames, selectedCharacterIds])

  return {
    selectedCharacterNames,
    selectedCharacterIds,
    editedPrompt,
    isRegenerating,
    handleToggleCharacter,
    handleToggleCharacterId,
    handlePromptChange,
    handleRegenerate
  }
}

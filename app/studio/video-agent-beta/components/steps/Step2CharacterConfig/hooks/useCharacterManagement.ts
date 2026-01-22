/**
 * Character Management Hook
 * 处理角色管理相关的操作：上传图片、选择预设、保存确认
 */

import { useState, useRef, useCallback } from 'react'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { CharacterState } from './useCharacterState'
import { CharacterPreset } from '@/lib/constants/character-presets'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface UseCharacterManagementProps {
  project: VideoAgentProject
  characterStates: Record<string, CharacterState>
  setCharacterStates: React.Dispatch<React.SetStateAction<Record<string, CharacterState>>>
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onNext: () => void
  setError: (error: string | null) => void
}

export function useCharacterManagement({
  project,
  characterStates,
  setCharacterStates,
  onUpdate,
  onNext,
  setError
}: UseCharacterManagementProps) {
  const { updateCharacters, updateProject } = useVideoAgentAPI()
  const [isSaving, setIsSaving] = useState(false)

  // 🔥 关键修复：使用 ref 追踪正在进行的请求，防止并发导致数据竞争
  const updateRequestRef = useRef<Promise<void> | null>(null)

  const buildCharactersPayload = useCallback((states: Record<string, CharacterState>) => {
    // IMPORTANT: Always send all characters (even without images) to avoid backend orphan cleanup.
    // Backend enforces unique names (case-insensitive).
    return Object.values(states).map(state => {
      const referenceImages = state.imageUrl ? [state.imageUrl] : []
      return {
        id: state.id,
        name: state.name,
        source: state.mode === 'upload' ? 'upload' : 'ai_generate',
        referenceImages,
        generationPrompt: state.prompt,
        negativePrompt: state.negativePrompt
      }
    })
  }, [])

  // 🎨 辅助函数：分析角色图片，自动生成描述
  const analyzeCharacterImage = useCallback(async (
    characterName: string,
    imageUrl: string
  ): Promise<string> => {
    try {
      console.log('[Character Management] Analyzing character image:', { characterName, imageUrl })

      const response = await fetch('/api/video-agent/analyze-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, characterName })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze character image')
      }

      const { data } = await response.json()
      console.log('[Character Management] Image analysis completed:', data)

      return data.description  // 返回详细描述作为 prompt
    } catch (error: any) {
      console.error('[Character Management] Image analysis failed:', error)
      // 分析失败时返回空字符串，不阻塞主流程
      return ''
    }
  }, [])

  // 上传图片
  const handleImageUpload = async (characterName: string, file: File) => {
    // 🔥 UX优化：立即设置加载状态，给用户即时反馈
    setCharacterStates(prev => ({
      ...prev,
      [characterName]: {
        ...prev[characterName],
        isGenerating: true,
        error: undefined
      }
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const { url } = await response.json()

      // 🎨 自动分析图片，生成描述
      const generatedPrompt = await analyzeCharacterImage(characterName, url)

      // 🔥 Update local state immediately for snappy UX.
      // Then persist to DB so storyboard regenerate always sees the latest reference image.
      const nextStates = {
        ...characterStates,
        [characterName]: {
          ...characterStates[characterName],
          imageUrl: url,
          mode: 'upload' as const,
          prompt: generatedPrompt || characterStates[characterName]?.prompt,
          isGenerating: false,
          error: undefined
        }
      }

      setCharacterStates(nextStates)

      try {
        // Always send the full payload to avoid backend orphan cleanup.
        const charactersData = buildCharactersPayload(nextStates)
        await updateCharacters(project.id, { characters: charactersData })
        console.log('[Character Management] ✅ Uploaded character image persisted to DB:', {
          characterName,
          imageUrl: url
        })
      } catch (persistErr: any) {
        console.error('[Character Management] ❌ Failed to persist uploaded image to DB:', persistErr)
        // Do not block the user; show a soft error.
        setError(persistErr?.message || 'Failed to save character image')
      }
    } catch (err: any) {
      setError(err.message)
      // 🔥 失败时也要关闭加载状态
      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          isGenerating: false,
          error: err.message
        }
      }))
    }
  }

  // 处理预设角色选择
  const handleSelectPreset = async (characterName: string, preset: CharacterPreset) => {
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`[Character Management] [${callId}] 🎯 handleSelectPreset called:`, { characterName, presetName: preset.name })

    // 🔥 UX优化：立即设置加载状态和预设图片，给用户即时反馈
    const oldName = characterName
    const newName = preset.name

    const currentState = characterStates[oldName] || {
      prompt: '',
      negativePrompt: '',
      isGenerating: false,
      mode: 'ai'
    }

    // 🔥 立即更新UI：显示预设图片 + 加载状态
    setCharacterStates(prev => {
      const newStates = { ...prev }
      delete newStates[oldName]
      newStates[newName] = {
        ...currentState,
        name: newName,
        imageUrl: preset.imageUrl,  // 立即显示预设图片
        mode: 'upload',
        prompt: '',  // 🔥 清空旧描述
        isGenerating: true,  // 显示加载状态
        error: undefined
      }
      return newStates
    })

    // 🔥 关键修复：如果有正在进行的请求，等待它完成
    if (updateRequestRef.current) {
      console.log(`[Character Management] [${callId}] ⏳ Waiting for previous update to complete...`)
      try {
        await updateRequestRef.current
      } catch (error) {
        console.warn(`[Character Management] [${callId}] ⚠️ Previous update failed, continuing anyway:`, error)
      }
    }

    const currentPrompt = currentState.prompt || ''
    const currentNegativePrompt = currentState.negativePrompt || ''

    // 🔥 构建最终状态对象（用于数据库更新）
    const newStates = { ...characterStates }
    delete newStates[oldName]
    newStates[newName] = {
      ...currentState,
      name: newName,
      imageUrl: preset.imageUrl,
      mode: 'upload',
      prompt: '',  // 🔥 清空旧描述，避免与新图片冲突（待后续 Vision API 自动生成）
      negativePrompt: currentNegativePrompt,
      isGenerating: false  // 准备关闭加载状态
    }

    // 🔥 立即更新数据库（使用新构建的状态）
    // 将整个更新操作包装为 Promise 并保存到 ref
    const updatePromise = (async () => {
      try {
      // 🔥 关键修复：必须传递所有角色，而不是只传递当前选择的角色
      // 否则 API 的孤儿清理逻辑会删除其他角色
      const allCharactersData = buildCharactersPayload(newStates)

      // 🔥 额外保护：去重（按 name 字段），避免数据重复导致数据库错误
      const uniqueCharactersMap = new Map<string, typeof allCharactersData[0]>()
      allCharactersData.forEach(char => {
        uniqueCharactersMap.set(char.name, char)
      })
      const uniqueCharactersData = Array.from(uniqueCharactersMap.values())

      console.log(`[Character Management] [${callId}] 📝 Updating all characters:`, {
        totalCharactersBeforeDedup: allCharactersData.length,
        totalCharactersAfterDedup: uniqueCharactersData.length,
        updatedCharacter: newName,
        allNames: uniqueCharactersData.map(c => c.name)
      })

      await updateCharacters(project.id, { characters: uniqueCharactersData })
      console.log(`[Character Management] [${callId}] ✅ Updated character in database:`, { oldName, newName, imageUrl: preset.imageUrl })

      // 🎨 自动分析预设图片，生成描述
      console.log(`[Character Management] [${callId}] 🔍 Analyzing preset image...`)
      const generatedPrompt = await analyzeCharacterImage(newName, preset.imageUrl)

      if (generatedPrompt) {
        console.log(`[Character Management] [${callId}] ✅ Image analysis completed, updating prompt...`)
        // 更新数据库中的角色描述
        await updateCharacters(project.id, {
          characters: uniqueCharactersData.map(char =>
            char.name === newName
              ? { ...char, generationPrompt: generatedPrompt }
              : char
          )
        })

        // 同时更新本地状态
        setCharacterStates(prev => ({
          ...prev,
          [newName]: {
            ...prev[newName],
            prompt: generatedPrompt
          }
        }))
      }

      // 改名的权威同步应由后端处理（避免多端/并发覆盖）。
      } catch (err: any) {
        console.error(`[Character Management] [${callId}] ❌ Failed to update character in database:`, err)
        setError(err.message)
        // 🔥 失败时关闭加载状态
        setCharacterStates(prev => ({
          ...prev,
          [newName]: {
            ...prev[newName],
            isGenerating: false,
            error: err.message
          }
        }))
      }
    })()

    // 保存 Promise 到 ref
    updateRequestRef.current = updatePromise

    // 等待完成
    try {
      await updatePromise
      // 🔥 成功完成后关闭加载状态
      setCharacterStates(prev => ({
        ...prev,
        [newName]: {
          ...prev[newName],
          isGenerating: false
        }
      }))

      // 🔥 方案 1：立即同步角色名称到 script_analysis
      console.log(`[Character Management] [${callId}] 🔄 Syncing character name to script_analysis...`)
      await syncCharacterNameToAnalysis(oldName, newName)
      console.log(`[Character Management] [${callId}] ✅ Character name synced to script_analysis`)
    } catch (error) {
      // 错误已在内部 catch 块中处理
      console.error(`[Character Management] [${callId}] ❌ handleSelectPreset failed:`, error)
    } finally {
      // 清理 ref
      updateRequestRef.current = null
    }
  }

  // 确认并继续
  const handleConfirm = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // IMPORTANT: Always send all characters to avoid backend orphan cleanup.
      const charactersData = buildCharactersPayload(characterStates)
      await updateCharacters(project.id, { characters: charactersData })

      // 如果有角色名称变更，更新 script_analysis
      const nameMapping: Record<string, string> = {}
      Object.keys(characterStates).forEach(key => {
        const state = characterStates[key]
        if (key !== state.name) {
          nameMapping[key] = state.name
        }
      })

      if (Object.keys(nameMapping).length > 0 && project.script_analysis) {
        const updatedAnalysis = { ...project.script_analysis }

        // 更新全局角色列表，并去重（防止多个角色被改成同一个名称）
        updatedAnalysis.characters = Array.from(new Set(
          updatedAnalysis.characters.map(name => nameMapping[name] || name)
        ))

        // 🔥 关键修复：不仅更新 shot.characters 数组，还要替换所有文本描述中的人物名称
        updatedAnalysis.shots = updatedAnalysis.shots.map(shot => {
          let updatedShot = {
            ...shot,
            // 去重 characters 数组
            characters: Array.from(new Set(
              shot.characters.map(name => nameMapping[name] || name)
            ))
          }

          // 对每个需要替换的名称进行替换
          Object.entries(nameMapping).forEach(([oldName, newName]) => {
            const oldNamePattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
            updatedShot = {
              ...updatedShot,
              description: updatedShot.description.replace(oldNamePattern, newName),
              camera_angle: updatedShot.camera_angle.replace(oldNamePattern, newName),
              mood: updatedShot.mood.replace(oldNamePattern, newName)
            }
          })

          return updatedShot
        })

        // NOTE: script_analysis 的权威同步应由后端在 /characters 内完成。
        // 这里保留本地更新用于即时 UI 反馈，但应逐步收口。
        await updateProject(project.id, { script_analysis: updatedAnalysis })
        onUpdate({ script_analysis: updatedAnalysis })
      }

      onNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 辅助函数：同步角色名称变更到 script_analysis
  const syncCharacterNameToAnalysis = useCallback(async (
    oldName: string,
    newName: string
  ) => {
    if (!project.script_analysis) return

    const updatedAnalysis = { ...project.script_analysis }

    // 更新全局角色列表，并去重
    updatedAnalysis.characters = Array.from(new Set(
      updatedAnalysis.characters.map(name => name === oldName ? newName : name)
    ))

    // 创建正则表达式，匹配旧名称（单词边界，避免部分匹配）
    const oldNamePattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')

    // 更新所有 shots 中的引用
    updatedAnalysis.shots = updatedAnalysis.shots.map(shot => ({
      ...shot,
      characters: Array.from(new Set(
        shot.characters.map(name => name === oldName ? newName : name)
      )),
      description: shot.description.replace(oldNamePattern, newName),
      camera_angle: shot.camera_angle.replace(oldNamePattern, newName),
      mood: shot.mood.replace(oldNamePattern, newName),
      video_prompt: shot.video_prompt?.replace(oldNamePattern, newName)  // 🔥 关键修复：同时更新 video_prompt
    }))

    // 保存到数据库
    await updateProject(project.id, { script_analysis: updatedAnalysis })

    // 同时更新本地 store
    onUpdate({ script_analysis: updatedAnalysis })
  }, [project, updateProject, onUpdate])

  // 处理名称变更 (带防抖)
  const handleNameChangeInternal = useCallback(async (oldName: string, newName: string) => {
    if (oldName === newName) return
    if (!newName.trim()) {
      setError('Character name cannot be empty')
      return
    }

    console.log('[Character Management] Name change:', { oldName, newName })

    try {
      // 🔥 1. 先构建新状态（同步操作）
      const newStates = { ...characterStates }
      const currentState = newStates[oldName]
      if (!currentState) {
        setError('Character not found')
        return
      }

      delete newStates[oldName]
      newStates[newName] = { ...currentState, name: newName }

      // 🔥 2. 立即更新本地状态
      setCharacterStates(newStates)

      // 🔥 3. 使用新状态构建角色数据（与 handleSelectPreset 一致）
      const allCharactersData = buildCharactersPayload(newStates)

      // 去重
      const uniqueCharactersMap = new Map<string, typeof allCharactersData[0]>()
      allCharactersData.forEach(char => {
        uniqueCharactersMap.set(char.name, char)
      })
      const uniqueCharactersData = Array.from(uniqueCharactersMap.values())

      // 🔥 4. 调用 API 更新
      await updateCharacters(project.id, { characters: uniqueCharactersData })

      // 改名的权威同步应由后端处理（避免多端/并发覆盖）。

      console.log('[Character Management] ✅ Name change completed')
    } catch (err: any) {
      console.error('[Character Management] ❌ Name change failed:', err)
      setError(err.message || 'Failed to update character name')

      // 回滚本地状态
      setCharacterStates(prev => {
        const newStates = { ...prev }
        const currentState = newStates[newName]
        if (!currentState) return prev

        delete newStates[newName]
        newStates[oldName] = { ...currentState, name: oldName }
        return newStates
      })
    }
  }, [characterStates, updateCharacters, project.id, syncCharacterNameToAnalysis, setCharacterStates, setError])

  // 防抖处理
  const handleNameChange = useDebounce(handleNameChangeInternal, 500)

  return {
    handleImageUpload,
    handleSelectPreset,
    handleConfirm,
    handleNameChange,
    isSaving
  }
}

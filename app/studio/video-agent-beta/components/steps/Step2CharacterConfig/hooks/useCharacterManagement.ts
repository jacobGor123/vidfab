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
  const { updateCharacters, updateProject, replaceCharacterInShots } = useVideoAgentAPI()
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

    // IMPORTANT:
    // - `characterName` here is the card key from state/DB and is what the backend expects.
    // - The script text may use a different alias (e.g. "the orange cat"), but that should
    //   be handled server-side (character-replace) rather than changing the identity key.
    const oldName = String(characterName || '').trim()
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

    // Defensive: if the old card wasn't present in state (e.g. mismatch between display label
    // and stored key), don't proceed with DB write / shot sync, otherwise we risk creating a
    // second card and leaving the old one polling.
    if (!characterStates[oldName]) {
      console.warn(`[Character Management] [${callId}] ⚠️ Character key not found in state; aborting replacement to avoid duplicates:`, {
        oldName,
        availableKeys: Object.keys(characterStates)
      })
      setCharacterStates(prev => ({
        ...prev,
        [newName]: {
          ...prev[newName],
          isGenerating: false,
          error: 'Character not found in current state'
        }
      }))
      return
    }

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

      // 🔥 Sync shot input fields (description/character_action/video_prompt) so users don't have
      // to manually edit prompts/actions after character replacement.
      // This does NOT regenerate any existing storyboard/video assets; it only updates inputs.
      try {
        // A) Safe deterministic replacement: immediately removes old names from inputs.
        const replaceRes = await replaceCharacterInShots(project.id, {
          fromName: oldName,
          toName: newName,
          // In strict mode we still want the shots/characters list to stay consistent,
          // even if the old name doesn't appear in text yet.
          // Use mentioned to reduce accidental replacements; backend matches common aliases.
          scope: 'mentioned'
        })
        console.log(`[Character Management] [${callId}] replaceCharacterInShots response:`, {
          // callAPI unwraps { success, data } and returns only `data`
          updatedShots: replaceRes?.updatedShots,
          analysisShotCount: replaceRes?.script_analysis?.shots?.length,
          analysisCharacters: replaceRes?.script_analysis?.characters
        })

        if (replaceRes?.script_analysis) {
          onUpdate({ script_analysis: replaceRes.script_analysis })
        }
        console.log(`[Character Management] [${callId}] ✅ Synced shots after character replacement:`, {
          updatedShots: replaceRes?.updatedShots
        })
      } catch (syncErr: any) {
        console.warn(`[Character Management] [${callId}] ⚠️ Failed to sync shots after character replacement:`, syncErr)
      }

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

      // NOTE: Strict mode (your requirement): do NOT rewrite story/plot text.
      // Only replace names via replaceCharacterInShots.

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

      // script_analysis / project_shots 输入同步已在 replaceCharacterInShots 中完成。
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

      // NOTE: script_analysis / project_shots 的同步由后端负责（/characters + /shots/character-replace）。
      // 这里不再写 script_analysis，避免与后端替换逻辑产生竞态。
      /*
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
              description: updatedShot.description.replace(oldNamePattern, newName)
            }
          })

          return updatedShot
        })

        // NOTE: script_analysis 的权威同步应由后端在 /characters 内完成。
        // 这里保留本地更新用于即时 UI 反馈，但应逐步收口。
        await updateProject(project.id, { script_analysis: updatedAnalysis })
        onUpdate({ script_analysis: updatedAnalysis })
      }
      */

      onNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // NOTE: script_analysis / project_shots 的输入同步由后端批处理接口
  // /shots/character-replace 负责，避免这里和后端产生竞态/覆盖。

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
  }, [characterStates, updateCharacters, project.id, setCharacterStates, setError])

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

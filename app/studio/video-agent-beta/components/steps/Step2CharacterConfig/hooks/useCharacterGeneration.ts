/**
 * Character Generation Hook
 * 处理角色生成相关的操作：生成Prompts、批量生成、单个生成
 * Updated: 2026-02-04 - Force Vercel rebuild
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { CharacterState } from './useCharacterState'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

interface CharacterPrompt {
  characterName: string
  prompt: string
  negativePrompt: string
}

interface UseCharacterGenerationProps {
  project: VideoAgentProject
  characterStates: Record<string, CharacterState>
  setCharacterStates: React.Dispatch<React.SetStateAction<Record<string, CharacterState>>>
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export function useCharacterGeneration({
  project,
  characterStates,
  setCharacterStates,
  onUpdate
}: UseCharacterGenerationProps) {
  console.log('🔧🔧🔧 [HOOK] useCharacterGeneration INITIALIZED - Build:', 'b4b4ccea')

  const { generateCharacterPrompts, batchGenerateCharacters, generateCharacterImage, getCharacters, updateCharacters, replaceCharacterInShots, getProject } = useVideoAgentAPI()

  // 🔥 新增：分析角色图片，提取描述
  const analyzeCharacterImage = async (characterName: string, imageUrl: string): Promise<string> => {
    try {
      console.log('[Character Generation] Analyzing character image:', { characterName, imageUrl })

      const response = await fetch('/api/video-agent/analyze-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, characterName })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze character image')
      }

      const { data } = await response.json()
      console.log('[Character Generation] Image analysis completed:', data)

      return data.description
    } catch (error: any) {
      console.error('[Character Generation] Image analysis failed:', error)
      return ''
    }
  }

  // IMPORTANT: Always send all characters (even without images) to avoid backend orphan cleanup.
  // Backend enforces unique names (case-insensitive).
  const buildCharactersPayload = useCallback((states: Record<string, CharacterState>) => {
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

  // 🔥 修复：使用项目中保存的图片风格，而不是硬编码
  const selectedStyle = project.image_style_id || 'realistic'

  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 轮询相关状态
  const [isPolling, setIsPolling] = useState(false)
  const lastPollSignatureRef = useRef<string>('')
  const isPollingRef = useRef(isPolling)

  useEffect(() => {
    isPollingRef.current = isPolling
  }, [isPolling])

  // 轮询角色生成状态
  const pollCharacterStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const data = await getCharacters(project.id)
      if (!data || !Array.isArray(data)) return

      // 生成签名用于去重
      const signature = data
        .map((char: any) => {
          const imageUrl = char.character_reference_images?.[0]?.image_url || ''
          return `${char.character_name}:${imageUrl.length}`
        })
        .join('|')

      // 如果数据没有变化，跳过更新
      if (signature && signature === lastPollSignatureRef.current) {
        return
      }
      lastPollSignatureRef.current = signature

      // 更新角色状态
      const newStates = { ...characterStates }

      // 🔥 步骤 1: 从数据库同步状态到本地
      data.forEach((char: any) => {
        const characterName = char.character_name
        if (newStates[characterName]) {
          newStates[characterName].id = char.id
          const dbImageUrl = char.character_reference_images?.[0]?.image_url
          const localImageUrl = newStates[characterName].imageUrl

          if (dbImageUrl) {
            // 数据库有图片 URL，更新到本地
            newStates[characterName].imageUrl = dbImageUrl
            newStates[characterName].isGenerating = false
            newStates[characterName].error = undefined
          } else if (localImageUrl && !newStates[characterName].isGenerating) {
            // 本地有图片但数据库还没有，且不在生成中
            // 这是正常情况（数据库同步延迟），保留本地图片即可
          }
        }
      })

      setCharacterStates(newStates)

      // 检查所有本地角色状态
      const hasGenerating = Object.values(newStates).some(state => state.isGenerating)

      // 轮询控制：只在轮询已启动的情况下检查是否停止
      if (!hasGenerating && isPollingRef.current) {
        setIsPolling(false)
      }
    } catch (err) {
      console.error('[Character Generation] Failed to poll status:', err)
    }
  }, [project.id, characterStates, getCharacters])

  // 启动轮询
  useEffect(() => {
    if (isPolling) {
      // 立即轮询一次
      pollCharacterStatus()

      // 然后每2秒轮询一次
      const interval = setInterval(pollCharacterStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [isPolling, pollCharacterStatus])

  // ✅ 不再自动启动轮询，只在批量生成时手动启动
  // 单个生成是同步操作，不需要轮询

  // 自动生成 Prompts
  const handleGeneratePrompts = async () => {
    setIsGeneratingPrompts(true)
    setError(null)

    try {
      const data = await generateCharacterPrompts(project.id, { imageStyle: selectedStyle })
      const { characterPrompts } = data as { characterPrompts: CharacterPrompt[] }

      // 更新人物状态
      const newStates = { ...characterStates }
      characterPrompts.forEach(cp => {
        if (newStates[cp.characterName]) {
          newStates[cp.characterName] = {
            ...newStates[cp.characterName],
            prompt: cp.prompt,
            negativePrompt: cp.negativePrompt
          }
        }
      })
      setCharacterStates(newStates)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGeneratingPrompts(false)
    }
  }

  const buildPromptGenerationBaseStates = useCallback((): Record<string, CharacterState> => {
    const baseStates: Record<string, CharacterState> = { ...characterStates }
    Object.values(baseStates).forEach(state => {
      baseStates[state.name] = {
        ...state,
        prompt: (state.prompt || '').trim(),
        negativePrompt: (state.negativePrompt || '').trim()
      }
    })
    return baseStates
  }, [characterStates])

  // 批量生成所有人物图片
  const handleBatchGenerate = async () => {
    // 防止重复调用
    if (isBatchGenerating) {
      return
    }

    setIsBatchGenerating(true)
    setError(null)

    try {
      const currentStates = buildPromptGenerationBaseStates()

      // 🚫 严格规则：Generate All 绝不重新生成或覆盖 prompt。
      // 只使用当前 UI 中已有的 prompt 进行批量生成，避免出现“猫 → 人”的意外替换。
      // 如果某个角色没有 prompt，则提示用户先点 Prompts Only 或手动补全。
      const missingPrompts = Object.values(currentStates)
        .filter(s => !(s.prompt || '').trim())
        .map(s => s.name)

      if (missingPrompts.length > 0) {
        setError(`Missing prompts for: ${missingPrompts.join(', ')}. Please click "Prompts Only" first or fill them manually.`)
        return
      }

      // 为所有角色生成图片
      const promptsToGenerate = Object.values(currentStates)
        .filter(s => (s.prompt || '').trim())
        .map(s => ({
          characterName: s.name,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt || ''
        }))

      await batchGenerateImages(promptsToGenerate, currentStates)

    } catch (err: any) {
      setError(err.message)
      // 清除生成中状态
      const newStates = { ...characterStates }
      Object.keys(newStates).forEach(key => {
        newStates[key].isGenerating = false
      })
      setCharacterStates(newStates)
    } finally {
      setIsBatchGenerating(false)
    }
  }

  // 批量生成图片的核心逻辑
  const batchGenerateImages = async (
    promptsToGenerate: Array<{ characterName: string; prompt: string; negativePrompt: string }>,
    currentStates: Record<string, CharacterState>
  ) => {
    if (promptsToGenerate.length === 0) {
      setError('No prompts available to generate')
      return
    }

    // 设置所有人物为生成中状态
    const newStates = { ...currentStates }
    promptsToGenerate.forEach(cp => {
      if (newStates[cp.characterName]) {
        newStates[cp.characterName].isGenerating = true
        newStates[cp.characterName].error = undefined
      }
    })
    setCharacterStates(newStates)

    const data = await batchGenerateCharacters(project.id, { characterPrompts: promptsToGenerate }) as any
    const results = data?.results || []

    // 更新生成结果
    const tempStates = { ...currentStates }
    let allSuccess = true

    if (results.length > 0) {
      results.forEach((result: any) => {
        if (tempStates[result.characterName]) {
          tempStates[result.characterName].isGenerating = false
          if (result.status === 'success' && result.imageUrl) {
            tempStates[result.characterName].imageUrl = result.imageUrl
          } else {
            tempStates[result.characterName].error = result.error || 'Generation failed'
            allSuccess = false
          }
        }
      })
    } else {
      // 如果没有返回结果，标记所有为失败
      Object.keys(tempStates).forEach(key => {
        if (tempStates[key].isGenerating) {
          tempStates[key].isGenerating = false
          tempStates[key].error = 'No results returned from API'
          allSuccess = false
        }
      })
    }

    setCharacterStates(tempStates)

    // 🔥 新增：批量生成后，同步所有成功生成的角色的分镜描述
    const successfulCharacters = results.filter((r: any) => r.status === 'success').map((r: any) => r.characterName)
    if (successfulCharacters.length > 0) {
      try {
        // 对每个成功生成的角色触发同步
        for (const charName of successfulCharacters) {
          try {
            await replaceCharacterInShots(project.id, {
              fromName: charName,
              toName: charName,  // 名称不变，但触发同步
              scope: 'mentioned'
            })
            console.log('[Character Generation] ✅ Synced shots for:', charName)
          } catch (syncErr: any) {
            console.warn(`[Character Generation] ⚠️ Failed to sync shots for ${charName}:`, syncErr)
          }
        }
        console.log('[Character Generation] ✅ Batch sync completed for', successfulCharacters.length, 'character(s)')
      } catch (err: any) {
        console.warn('[Character Generation] ⚠️ Batch sync error:', err)
      }
    }

    // 只有在需要同步数据库状态时才启动轮询（例如需要刷新持久化的图片 URL）
    // 如果所有结果都成功返回了，不需要轮询
    if (allSuccess && results.length === promptsToGenerate.length) {
      // 不需要轮询，所有图片都已生成成功
    } else {
      // 启动轮询来同步数据库状态
      setIsPolling(true)

      // 添加超时保护：15 秒后自动停止轮询
      setTimeout(() => {
        if (isPollingRef.current) {
          setIsPolling(false)
          // 清理仍在生成中的状态
          setCharacterStates(prev => {
            const updated = { ...prev }
            Object.keys(updated).forEach(key => {
              if (updated[key].isGenerating) {
                updated[key].isGenerating = false
                updated[key].error = 'Generation timeout'
              }
            })
            return updated
          })
        }
      }, 15000)
    }
  }

  // 单个人物生成
  const handleSingleGenerate = async (characterName: string) => {
    console.log('🎯🎯🎯 [DEBUG] handleSingleGenerate called!', { characterName })

    const state = characterStates[characterName]
    if (!state || !(state.prompt || '').trim()) {
      setError('Please enter a prompt first')
      return
    }

    setCharacterStates(prev => ({
      ...prev,
      [characterName]: { ...prev[characterName], isGenerating: true, error: undefined }
    }))

    try {
      console.log('🎯🎯🎯 [DEBUG] About to call generateCharacterImage', {
        characterName,
        prompt: state.prompt?.substring(0, 100),
        imageStyle: selectedStyle
      })

      const result = await generateCharacterImage({
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        aspectRatio: '1:1',
        imageStyle: selectedStyle  // 🔥 传递 imageStyle 以启用后处理
      })

      console.log('🎯🎯🎯 [DEBUG] generateCharacterImage returned', {
        characterName,
        hasImageUrl: !!result?.imageUrl
      })

      // 安全检查：确保有 imageUrl 才更新
      if (!result || !result.imageUrl) {
        throw new Error('No image URL returned from API')
      }

      // 🔥 新增：分析新图片，提取角色描述
      let newCharacterName = characterName
      let analysisDescription = ''

      try {
        analysisDescription = await analyzeCharacterImage(characterName, result.imageUrl)

        if (analysisDescription && analysisDescription.trim()) {
          // 提取简称（例如 "Leo"）和新描述
          const shortName = characterName.split('(')[0].trim()

          // 🔥 截断描述，确保总长度不超过 400 字符（数据库限制 500，留一些余量）
          let description = analysisDescription.trim()
          const maxDescriptionLength = 400 - shortName.length - 3  // 3 = " ()"
          if (description.length > maxDescriptionLength) {
            description = description.substring(0, maxDescriptionLength - 3) + '...'
          }

          newCharacterName = `${shortName} (${description})`

          console.log('[Character Generation] 🔄 Character name updated:', {
            oldName: characterName,
            newName: newCharacterName,
            newNameLength: newCharacterName.length
          })
        }
      } catch (analysisErr: any) {
        console.warn('[Character Generation] ⚠️ Failed to analyze image:', analysisErr)
        // 继续，使用原名称
      }

      // 立即更新本地状态
      setCharacterStates(prev => {
        const nextStates = { ...prev }

        // 🔥 如果名称变化了，需要删除旧的 key，添加新的 key
        if (newCharacterName !== characterName) {
          delete nextStates[characterName]
          nextStates[newCharacterName] = {
            ...prev[characterName],
            name: newCharacterName,
            imageUrl: result.imageUrl,
            isGenerating: false
          }
        } else {
          nextStates[characterName] = {
            ...prev[characterName],
            imageUrl: result.imageUrl,
            isGenerating: false
          }
        }

        // Persist in background: send full payload to avoid backend orphan cleanup.
        // (Non-blocking; errors are logged but don't break the UX.)
        const charactersData = buildCharactersPayload(nextStates)
        updateCharacters(project.id, { characters: charactersData })
          .then(() => {
            console.log('[Character Generation] ✅ Persisted generated character image to DB:', {
              oldName: characterName,
              newName: newCharacterName,
              imageUrl: result.imageUrl
            })
          })
          .catch((e: any) => {
            console.error('[Character Generation] ❌ Failed to persist generated image to DB:', e)
          })

        return nextStates
      })

      // 🔥 增强：如果角色名称变化了，同步分镜描述
      if (newCharacterName !== characterName) {
        try {
          const result = await replaceCharacterInShots(project.id, {
            fromName: characterName,
            toName: newCharacterName,
            scope: 'mentioned'
          })
          console.log('[Character Generation] ✅ Synced shots after character name change:', {
            from: characterName,
            to: newCharacterName
          })

          // 🔥 新增：重新加载项目数据，更新前端 script_analysis
          // 直接调用 API 而不依赖 hook（避免缓存问题）
          try {
            const response = await fetch(`/api/video-agent/projects/${project.id}`, {
              credentials: 'include'
            })

            if (!response.ok) {
              throw new Error(`Failed to reload project: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.success && data.data?.script_analysis) {
              onUpdate({ script_analysis: data.data.script_analysis })
              console.log('[Character Generation] ✅ Updated project script_analysis in UI')
            }
          } catch (reloadErr: any) {
            console.warn('[Character Generation] ⚠️ Failed to reload project data:', reloadErr)
          }
        } catch (syncErr: any) {
          console.warn('[Character Generation] ⚠️ Failed to sync shots after regeneration:', syncErr)
          // 不阻塞主流程，继续
        }
      } else {
        console.log('[Character Generation] ℹ️ Character name unchanged, skipping shot sync')
      }
    } catch (err: any) {
      console.error(`[Character Generation] Failed to generate ${characterName}:`, err)
      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          isGenerating: false,
          error: err.message || 'Failed to generate image'
        }
      }))
    }
  }

  return {
    handleGeneratePrompts,
    handleBatchGenerate,
    handleSingleGenerate,
    isGeneratingPrompts,
    isBatchGenerating,
    error,
    setError
  }
}

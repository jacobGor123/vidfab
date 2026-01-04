/**
 * Character Generation Hook
 * 处理角色生成相关的操作：生成Prompts、批量生成、单个生成
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
}

export function useCharacterGeneration({
  project,
  characterStates,
  setCharacterStates
}: UseCharacterGenerationProps) {
  const { generateCharacterPrompts, batchGenerateCharacters, generateCharacterImage, getCharacters } = useVideoAgentAPI()
  const [selectedStyle] = useState('realistic')
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
          const dbImageUrl = char.character_reference_images?.[0]?.image_url
          const localImageUrl = newStates[characterName].imageUrl

          if (dbImageUrl) {
            // 数据库有图片 URL，更新到本地
            newStates[characterName].imageUrl = dbImageUrl
            newStates[characterName].isGenerating = false
            newStates[characterName].error = undefined
          } else if (localImageUrl && !newStates[characterName].isGenerating) {
            // ✅ 本地有图片但数据库还没有，且不在生成中
            // 这是正常情况（数据库同步延迟），保留本地图片即可
            console.log(`[Character Generation] Keeping local image for ${characterName} (DB sync in progress)`)
            // ✅ 不再设置 hasPendingSync，数据库同步是后台操作，不影响用户体验
          }
        }
      })

      setCharacterStates(newStates)

      // 🔥 步骤 2: 检查所有本地角色状态（不仅仅是数据库中的）
      const hasGenerating = Object.values(newStates).some(state => state.isGenerating)

      // 🔍 调试日志：显示所有角色的状态
      console.log('[Character Generation] Poll status check:', {
        hasGenerating,
        isPolling: isPollingRef.current,
        characterStates: Object.entries(newStates).map(([name, state]) => ({
          name,
          isGenerating: state.isGenerating,
          hasImage: !!state.imageUrl,
          hasError: !!state.error
        }))
      })

      // ✅ 轮询控制：只在轮询已启动的情况下检查是否停止
      if (!hasGenerating && isPollingRef.current) {
        console.log('[Character Generation] 🛑 Stopping polling - all generation completed')
        setIsPolling(false)
      } else if (hasGenerating && !isPollingRef.current) {
        // ⚠️ 这里不应该自动启动轮询！只有批量生成时才手动启动
        console.warn('[Character Generation] ⚠️ Detected generating characters but polling not started. This should not happen for single generation.')
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
    setIsBatchGenerating(true)
    setError(null)

    try {
      const currentStates = buildPromptGenerationBaseStates()

      // ✅ 关键修复：如果用户已经为某些角色手动输入 prompt，则批量生成时不要覆盖。
      // 仅对 prompt 为空的角色生成/填充 prompt，避免出现“猫咪 → 人类”的意外替换。
      const missingPromptCharacterNames = Object.values(currentStates)
        .filter(s => !(s.prompt || '').trim())
        .map(s => s.name)

      let promptsFromApi: CharacterPrompt[] = []
      if (missingPromptCharacterNames.length > 0) {
        const data = await generateCharacterPrompts(project.id, { imageStyle: selectedStyle })
        promptsFromApi = (data.characterPrompts || [])
      }

      const newStates = { ...currentStates }
      promptsFromApi.forEach((cp: CharacterPrompt) => {
        if (!missingPromptCharacterNames.includes(cp.characterName)) return
        if (newStates[cp.characterName]) {
          newStates[cp.characterName].prompt = cp.prompt
          newStates[cp.characterName].negativePrompt = cp.negativePrompt
        }
      })

      setCharacterStates(newStates)

      // 为所有角色生成图片
      const promptsToGenerate = Object.values(newStates)
        .filter(s => (s.prompt || '').trim())
        .map(s => ({
          characterName: s.name,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt || ''
        }))

      await batchGenerateImages(promptsToGenerate, newStates)

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

    const data = await batchGenerateCharacters(project.id, { characterPrompts: promptsToGenerate })
    const { results } = data

    // 更新生成结果（临时状态，用于立即反馈）
    const tempStates = { ...currentStates }
    results.forEach((result: any) => {
      if (tempStates[result.characterName]) {
        tempStates[result.characterName].isGenerating = false
        if (result.status === 'success') {
          tempStates[result.characterName].imageUrl = result.imageUrl
        } else {
          tempStates[result.characterName].error = result.error
        }
      }
    })
    setCharacterStates(tempStates)

    // 🔥 启动智能轮询，自动同步数据库状态
    // 轮询会持续检查数据库，直到所有角色都生成完成
    // 这比固定延迟（如2秒）更可靠，能处理任何生成时长
    setIsPolling(true)
    console.log('[Character Generation] Started polling after batch generation')
  }

  // 单个人物生成
  const handleSingleGenerate = async (characterName: string) => {
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
      const result = await generateCharacterImage({
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        aspectRatio: '1:1'
      })

      // 安全检查：确保有 imageUrl 才更新
      if (!result || !result.imageUrl) {
        throw new Error('No image URL returned from API')
      }

      console.log(`[Character Generation] Image generated for ${characterName}:`, result.imageUrl)

      // 🔥 立即更新本地状态（用户能看到图片）
      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          imageUrl: result.imageUrl,
          isGenerating: false
        }
      }))

      // 🔥 保存到数据库（确保刷新页面后仍然存在）
      try {
        const response = await fetch(`/api/video-agent/projects/${project.id}/characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characters: [{
              name: characterName,
              source: 'ai_generate',
              referenceImages: [result.imageUrl]
            }]
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(`[Character Generation] Save API returned error:`, {
            status: response.status,
            error: errorData
          })
        } else {
          console.log(`[Character Generation] Saved ${characterName} to database`)
        }
      } catch (saveError) {
        console.error(`[Character Generation] Failed to save ${characterName} to database:`, saveError)
        // 不影响用户体验，只是数据库保存失败
      }

      // ✅ 单个生成是同步操作，已经有最终结果，不需要轮询
      console.log(`[Character Generation] Single generation completed for ${characterName}, no polling needed`)
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

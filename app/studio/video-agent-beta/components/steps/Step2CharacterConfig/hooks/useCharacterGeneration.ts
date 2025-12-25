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
      let hasGenerating = false
      let hasPendingSync = false  // 🔥 是否有等待数据库同步的角色

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
            // 🔥 本地有图片但数据库还没有，且不在生成中
            // 保留本地图片，不要被覆盖（可能是数据库同步延迟）
            console.log(`[Character Generation] Keeping local image for ${characterName} (DB sync pending)`)
            hasPendingSync = true  // 🔥 标记为需要继续轮询
          } else if (newStates[characterName].isGenerating) {
            // 没有图片但标记为生成中，继续轮询
            hasGenerating = true
          }
        }
      })

      setCharacterStates(newStates)

      // 🔥 智能控制轮询：只有没有正在生成的角色，且没有等待同步的角色时，才停止轮询
      const shouldPoll = hasGenerating || hasPendingSync
      if (!shouldPoll && isPollingRef.current) {
        console.log('[Character Generation] Stopping polling - all characters synced')
        setIsPolling(false)
      } else if (shouldPoll && !isPollingRef.current) {
        console.log('[Character Generation] Starting polling - found generating or pending characters')
        setIsPolling(true)
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

  // 检查是否有正在生成的角色，自动启动轮询
  useEffect(() => {
    const hasGenerating = Object.values(characterStates).some(state => state.isGenerating)
    if (hasGenerating && !isPolling) {
      console.log('[Character Generation] Starting polling - detected generating characters')
      setIsPolling(true)
    }
  }, [characterStates, isPolling])

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

  // 批量生成所有人物图片
  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true)
    setError(null)

    try {
      // 重新生成所有角色的 prompts
      const data = await generateCharacterPrompts(project.id, { imageStyle: selectedStyle })
      const { characterPrompts } = data

      // 更新所有人物的 prompts
      const newStates = { ...characterStates }
      characterPrompts.forEach((cp: CharacterPrompt) => {
        if (newStates[cp.characterName]) {
          newStates[cp.characterName].prompt = cp.prompt
          newStates[cp.characterName].negativePrompt = cp.negativePrompt
        }
      })
      setCharacterStates(newStates)

      // 为所有角色生成图片
      const promptsToGenerate = characterPrompts.map((cp: CharacterPrompt) => ({
        characterName: cp.characterName,
        prompt: cp.prompt,
        negativePrompt: cp.negativePrompt || ''
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

      // 🔥 延迟1秒后启动轮询（确保数据库已完成写入）
      setTimeout(() => {
        setIsPolling(true)
      }, 1000)
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

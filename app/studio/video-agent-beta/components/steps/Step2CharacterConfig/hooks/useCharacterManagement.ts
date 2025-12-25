/**
 * Character Management Hook
 * 处理角色管理相关的操作：上传图片、选择预设、保存确认
 */

import { useState } from 'react'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { CharacterState } from './useCharacterState'
import { CharacterPreset } from '@/lib/constants/character-presets'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

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

  // 上传图片
  const handleImageUpload = async (characterName: string, file: File) => {
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

      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          imageUrl: url,
          mode: 'upload'
        }
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 处理预设角色选择
  const handleSelectPreset = (characterName: string, preset: CharacterPreset) => {
    const oldName = characterName
    const newName = preset.name

    setCharacterStates(prev => {
      const newStates = { ...prev }
      const currentState = prev[oldName] || {
        prompt: '',
        negativePrompt: '',
        isGenerating: false,
        mode: 'ai'
      }

      newStates[oldName] = {
        ...currentState,
        name: newName,
        imageUrl: preset.imageUrl,
        mode: 'upload',
        prompt: currentState.prompt || '',
        negativePrompt: currentState.negativePrompt || ''
      }

      return newStates
    })
  }

  // 确认并继续
  const handleConfirm = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // 只保存有图片的人物
      const charactersWithImages = Object.values(characterStates)
        .filter(s => s.imageUrl)

      if (charactersWithImages.length > 0) {
        const charactersData = charactersWithImages.map(s => ({
          name: s.name,
          source: s.mode === 'upload' ? 'upload' : 'ai_generate',
          referenceImages: [s.imageUrl!],
          generationPrompt: s.prompt,
          negativePrompt: s.negativePrompt
        }))

        await updateCharacters(project.id, { characters: charactersData })
      }

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

        // 更新全局角色列表
        updatedAnalysis.characters = updatedAnalysis.characters.map(
          name => nameMapping[name] || name
        )

        // 更新每个 shot 的 characters 数组
        updatedAnalysis.shots = updatedAnalysis.shots.map(shot => ({
          ...shot,
          characters: shot.characters.map(name => nameMapping[name] || name)
        }))

        // 保存到数据库
        await updateProject(project.id, { script_analysis: updatedAnalysis })

        // 同时更新本地 store
        onUpdate({ script_analysis: updatedAnalysis })
      }

      onNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    handleImageUpload,
    handleSelectPreset,
    handleConfirm,
    isSaving
  }
}

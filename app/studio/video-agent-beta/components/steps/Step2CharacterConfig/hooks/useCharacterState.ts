/**
 * Character State Management Hook
 * 管理角色状态：初始化、数据加载、自动同步
 */

import { useState, useEffect } from 'react'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

export interface CharacterState {
  name: string
  prompt: string
  negativePrompt: string
  imageUrl?: string
  isGenerating: boolean
  error?: string
  mode: 'ai' | 'upload'
}

interface UseCharacterStateProps {
  project: VideoAgentProject
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export function useCharacterState({ project, onUpdate }: UseCharacterStateProps) {
  const { getCharacters, updateProject } = useVideoAgentAPI()
  const characters = project.script_analysis?.characters || []
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterState>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // 初始化人物状态 - 从数据库读取已保存的数据
  useEffect(() => {
    async function loadCharacterData() {
      setIsInitialLoading(true)
      const initialStates: Record<string, CharacterState> = {}

      // 先创建默认状态
      characters.forEach(char => {
        initialStates[char] = {
          name: char,
          prompt: '',
          negativePrompt: '',
          isGenerating: false,
          mode: 'ai'
        }
      })

      // 从数据库读取已保存的人物数据
      try {
        const data = await getCharacters(project.id)

        // 检测数据库中的角色名和 script_analysis 中的是否一致
        let needsSync = false
        const dbCharacterNames: string[] = []

        // 回填已保存的数据
        if (data && Array.isArray(data)) {
          data.forEach((char: any) => {
            dbCharacterNames.push(char.character_name)

            // 兼容性处理：如果数据库中的角色名在 script_analysis 中不存在
            let matchedKey = char.character_name
            if (!initialStates[char.character_name]) {
              needsSync = true
              console.warn('[useCharacterState] Character name mismatch:', {
                dbName: char.character_name,
                availableNames: Object.keys(initialStates)
              })
            } else {
              matchedKey = char.character_name
            }

            if (initialStates[matchedKey]) {
              const imageUrl = char.character_reference_images?.[0]?.image_url
              if (imageUrl) {
                initialStates[matchedKey].name = char.character_name
                initialStates[matchedKey].imageUrl = imageUrl
                initialStates[matchedKey].mode = char.source === 'upload' ? 'upload' : 'ai'
              }

              // 恢复 prompt 和 negative prompt
              if (char.generation_prompt) {
                initialStates[matchedKey].prompt = char.generation_prompt
              }
              if (char.negative_prompt) {
                initialStates[matchedKey].negativePrompt = char.negative_prompt
              }
            }
          })

          // 如果检测到名称不一致，自动同步 script_analysis
          if (needsSync && dbCharacterNames.length > 0) {
            await syncCharacterNames(dbCharacterNames, initialStates)
          }
        }
      } catch (error) {
        console.error('[useCharacterState] Failed to load character data:', error)
      }

      setCharacterStates(initialStates)
      setIsInitialLoading(false)
    }

    if (characters.length > 0 && project.id) {
      loadCharacterData()
    } else if (characters.length === 0) {
      setIsInitialLoading(false)
    }
  }, [characters, project.id])

  // 自动同步角色名称到 script_analysis
  const syncCharacterNames = async (
    dbCharacterNames: string[],
    initialStates: Record<string, CharacterState>
  ) => {
    console.log('[useCharacterState] 🔧 Auto-syncing character names from database')

    const nameMapping: Record<string, string> = {}
    characters.forEach((oldName, index) => {
      const newName = dbCharacterNames[index]
      if (newName && oldName !== newName) {
        nameMapping[oldName] = newName
        // 更新 initialStates 的 name 字段
        if (initialStates[oldName]) {
          initialStates[oldName].name = newName
        }
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
      try {
        await updateProject(project.id, { script_analysis: updatedAnalysis })
        onUpdate({ script_analysis: updatedAnalysis })
        console.log('[useCharacterState] ✅ Auto-synced character names:', nameMapping)
      } catch (error) {
        console.error('[useCharacterState] Failed to auto-sync:', error)
      }
    }
  }

  return {
    characterStates,
    setCharacterStates,
    isInitialLoading,
    characters
  }
}

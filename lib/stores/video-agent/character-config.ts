/**
 * Video Agent - 步骤 2: 角色配置
 * 处理角色的添加、更新、删除等操作
 */

import { StateCreator } from 'zustand'
import { Character, VideoAgentProject } from './types'

export interface CharacterConfigActions {
  addCharacter: (character: Omit<Character, 'id'>) => Promise<void>
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>
  removeCharacter: (id: string) => Promise<void>
}

export type CharacterConfigSlice = CharacterConfigActions

export const createCharacterConfigSlice: StateCreator<
  CharacterConfigSlice & {
    currentProject: VideoAgentProject | null
    isLoading: boolean
    error: string | null
    updateProject: (updates: Partial<VideoAgentProject>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
  },
  [],
  [],
  CharacterConfigSlice
> = (set, get) => ({
  // 添加角色
  addCharacter: async (character) => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/characters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(character)
        }
      )

      if (!response.ok) {
        throw new Error('添加人物失败')
      }

      const { data: newCharacter } = await response.json()

      get().updateProject({
        characters: [...(currentProject.characters || []), newCharacter]
      })

      set({ isLoading: false })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 更新角色
  updateCharacter: async (id, updates) => {
    const { currentProject } = get()
    if (!currentProject) return

    // TODO: 实现更新人物 API 调用
    get().updateProject({
      characters: currentProject.characters?.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    })
  },

  // 删除角色
  removeCharacter: async (id) => {
    const { currentProject } = get()
    if (!currentProject) return

    // TODO: 实现删除人物 API 调用
    get().updateProject({
      characters: currentProject.characters?.filter(c => c.id !== id)
    })
  }
})

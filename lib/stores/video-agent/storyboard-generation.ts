/**
 * Video Agent - 步骤 4: 分镜图生成
 * 处理分镜图的生成、重新生成和状态轮询
 */

import { StateCreator } from 'zustand'
import { Storyboard, VideoAgentProject } from './types'

export interface StoryboardGenerationState {
  storyboardPollingInterval: NodeJS.Timeout | null
}

export interface StoryboardGenerationActions {
  generateStoryboards: () => Promise<void>
  regenerateStoryboard: (shotNumber: number) => Promise<void>
  startPollingStoryboards: () => void
  stopPollingStoryboards: () => void
}

export type StoryboardGenerationSlice = StoryboardGenerationState & StoryboardGenerationActions

export const createStoryboardGenerationSlice: StateCreator<
  StoryboardGenerationSlice & {
    currentProject: VideoAgentProject | null
    isLoading: boolean
    error: string | null
    updateProject: (updates: Partial<VideoAgentProject>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
  },
  [],
  [],
  StoryboardGenerationSlice
> = (set, get) => ({
  // 初始状态
  storyboardPollingInterval: null,

  // 生成分镜图
  generateStoryboards: async () => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/storyboards/generate`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('分镜图生成失败')
      }

      // 开始轮询状态
      get().startPollingStoryboards()

      set({ isLoading: false })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 重新生成分镜图
  regenerateStoryboard: async (shotNumber) => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/storyboards/${shotNumber}/regenerate`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('重新生成分镜图失败')
      }

      set({ isLoading: false })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 开始轮询分镜图状态
  startPollingStoryboards: () => {
    const { currentProject, storyboardPollingInterval } = get()
    if (!currentProject || storyboardPollingInterval) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/video-agent/projects/${currentProject.id}/storyboards/status`
        )

        if (!response.ok) return

        const { data: storyboards } = await response.json()

        // 检查是否全部完成
        const allCompleted = storyboards.every(
          (sb: Storyboard) => sb.status === 'success' || sb.status === 'failed'
        )

        // 更新状态
        get().updateProject({ storyboards })

        // 如果全部完成,停止轮询
        if (allCompleted) {
          get().stopPollingStoryboards()
        }
      } catch (error) {
        console.error('轮询分镜图状态失败:', error)
      }
    }, 3000)  // 每 3 秒轮询一次

    set({ storyboardPollingInterval: interval })
  },

  // 停止轮询分镜图状态
  stopPollingStoryboards: () => {
    const { storyboardPollingInterval } = get()
    if (storyboardPollingInterval) {
      clearInterval(storyboardPollingInterval)
      set({ storyboardPollingInterval: null })
    }
  }
})

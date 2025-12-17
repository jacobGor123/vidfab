/**
 * Video Agent - 项目管理
 * 处理项目的创建、加载、更新、删除等操作
 */

import { StateCreator } from 'zustand'
import { VideoAgentProject } from './types'

export interface ProjectState {
  currentProject: VideoAgentProject | null
  isLoading: boolean
  error: string | null
}

export interface ProjectActions {
  createProject: (data: {
    duration: number
    storyStyle: string
    originalScript: string
    aspectRatio: '16:9' | '9:16'
    enableNarration: boolean
  }) => Promise<VideoAgentProject>
  loadProject: (id: string) => Promise<void>
  updateProject: (updates: Partial<VideoAgentProject>) => void
  deleteProject: (id: string) => Promise<void>
  resumeProject: (project: VideoAgentProject) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export type ProjectSlice = ProjectState & ProjectActions

export const createProjectSlice: StateCreator<
  ProjectSlice,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  // 初始状态
  currentProject: null,
  isLoading: false,
  error: null,

  // 创建项目
  createProject: async (data) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/video-agent/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: data.duration,
          story_style: data.storyStyle,
          original_script: data.originalScript,
          aspect_ratio: data.aspectRatio,
          enable_narration: data.enableNarration
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '创建项目失败')
      }

      const { data: project } = await response.json()

      set({
        currentProject: project,
        isLoading: false
      })

      return project
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 加载项目
  loadProject: async (id) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`/api/video-agent/projects/${id}`)

      if (!response.ok) {
        throw new Error('加载项目失败')
      }

      const { data: project } = await response.json()

      set({
        currentProject: project,
        isLoading: false
      })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
    }
  },

  // 更新项目
  updateProject: (updates) => {
    set(state => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, ...updates }
        : null
    }))
  },

  // 删除项目
  deleteProject: async (id) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`/api/video-agent/projects/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除项目失败')
      }

      set({
        currentProject: null,
        isLoading: false
      })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
    }
  },

  // 恢复项目
  resumeProject: (project) => {
    set({
      currentProject: project
    })
  },

  // 设置错误
  setError: (error) => set({ error }),

  // 设置加载状态
  setLoading: (loading) => set({ isLoading: loading }),

  // 重置
  reset: () => {
    set({
      currentProject: null,
      isLoading: false,
      error: null
    })
  }
})

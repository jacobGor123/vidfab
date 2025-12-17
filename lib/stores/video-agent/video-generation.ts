/**
 * Video Agent - 步骤 5: 视频生成
 * 处理视频片段的生成、重试和状态轮询
 */

import { StateCreator } from 'zustand'
import { VideoClip, VideoAgentProject } from './types'

export interface VideoGenerationState {
  videoPollingInterval: NodeJS.Timeout | null
}

export interface VideoGenerationActions {
  generateVideos: () => Promise<void>
  retryVideo: (shotNumber: number) => Promise<void>
  startPollingVideos: () => void
  stopPollingVideos: () => void
}

export type VideoGenerationSlice = VideoGenerationState & VideoGenerationActions

export const createVideoGenerationSlice: StateCreator<
  VideoGenerationSlice & {
    currentProject: VideoAgentProject | null
    isLoading: boolean
    error: string | null
    updateProject: (updates: Partial<VideoAgentProject>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
  },
  [],
  [],
  VideoGenerationSlice
> = (set, get) => ({
  // 初始状态
  videoPollingInterval: null,

  // 生成视频
  generateVideos: async () => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/videos/generate`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('视频生成失败')
      }

      // 开始轮询状态
      get().startPollingVideos()

      set({ isLoading: false })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 重试视频生成
  retryVideo: async (shotNumber) => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/videos/${shotNumber}/retry`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('重试视频生成失败')
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

  // 开始轮询视频状态
  startPollingVideos: () => {
    const { currentProject, videoPollingInterval } = get()
    if (!currentProject || videoPollingInterval) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/video-agent/projects/${currentProject.id}/videos/status`
        )

        if (!response.ok) return

        const { data: videoClips } = await response.json()

        // 检查是否全部完成
        const allCompleted = videoClips.every(
          (vc: VideoClip) => vc.status === 'success' || vc.status === 'failed'
        )

        // 更新状态
        get().updateProject({ video_clips: videoClips })

        // 如果全部完成,停止轮询
        if (allCompleted) {
          get().stopPollingVideos()
        }
      } catch (error) {
        console.error('轮询视频状态失败:', error)
      }
    }, 5000)  // 每 5 秒轮询一次

    set({ videoPollingInterval: interval })
  },

  // 停止轮询视频状态
  stopPollingVideos: () => {
    const { videoPollingInterval } = get()
    if (videoPollingInterval) {
      clearInterval(videoPollingInterval)
      set({ videoPollingInterval: null })
    }
  }
})

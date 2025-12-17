/**
 * Video Agent - 步骤 7: 视频合成
 * 处理最终视频的合成和状态轮询
 */

import { StateCreator } from 'zustand'
import { VideoAgentProject } from './types'

export interface VideoCompositionState {
  compositionPollingInterval: NodeJS.Timeout | null
}

export interface VideoCompositionActions {
  composeFinalVideo: () => Promise<void>
  pollCompositionStatus: () => void
  stopPollingComposition: () => void
}

export type VideoCompositionSlice = VideoCompositionState & VideoCompositionActions

export const createVideoCompositionSlice: StateCreator<
  VideoCompositionSlice & {
    currentProject: VideoAgentProject | null
    isLoading: boolean
    error: string | null
    updateProject: (updates: Partial<VideoAgentProject>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
  },
  [],
  [],
  VideoCompositionSlice
> = (set, get) => ({
  // 初始状态
  compositionPollingInterval: null,

  // 合成最终视频
  composeFinalVideo: async () => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/compose`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('视频合成失败')
      }

      // 开始轮询合成状态
      get().pollCompositionStatus()
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  },

  // 轮询合成状态
  pollCompositionStatus: () => {
    const { currentProject, compositionPollingInterval } = get()
    if (!currentProject || compositionPollingInterval) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/video-agent/projects/${currentProject.id}/compose/status`
        )

        if (!response.ok) return

        const { data } = await response.json()

        if (data.status === 'completed') {
          get().updateProject({
            final_video: data.final_video,
            status: 'completed',
            step_7_status: 'completed'
          })

          set({ isLoading: false })
          get().stopPollingComposition()
        } else if (data.status === 'failed') {
          set({
            error: data.error || '视频合成失败',
            isLoading: false
          })
          get().stopPollingComposition()
        }
      } catch (error) {
        console.error('轮询合成状态失败:', error)
      }
    }, 5000)

    set({ compositionPollingInterval: interval })
  },

  // 停止轮询合成状态
  stopPollingComposition: () => {
    const { compositionPollingInterval } = get()
    if (compositionPollingInterval) {
      clearInterval(compositionPollingInterval)
      set({ compositionPollingInterval: null })
    }
  }
})

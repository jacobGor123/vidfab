/**
 * Video Agent - 步骤 3: 图片风格
 * 处理图片风格的选择
 */

import { StateCreator } from 'zustand'
import { VideoAgentProject } from './types'

export interface ImageStyleActions {
  selectImageStyle: (styleId: string) => Promise<void>
}

export type ImageStyleSlice = ImageStyleActions

export const createImageStyleSlice: StateCreator<
  ImageStyleSlice & {
    currentProject: VideoAgentProject | null
    isLoading: boolean
    error: string | null
    updateProject: (updates: Partial<VideoAgentProject>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    goToStep: (step: number) => void
  },
  [],
  [],
  ImageStyleSlice
> = (set, get) => ({
  // 选择图片风格
  selectImageStyle: async (styleId) => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/image-style`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ styleId })
        }
      )

      if (!response.ok) {
        throw new Error('选择图片风格失败')
      }

      get().updateProject({
        image_style_id: styleId,
        current_step: 4,
        step_3_status: 'completed'
      })

      get().goToStep(4)
      set({ isLoading: false })
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message
      })
      throw error
    }
  }
})

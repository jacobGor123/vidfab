/**
 * Video Agent - 步骤 1: 脚本分析
 * 处理脚本分析、生成分镜表等
 */

import { StateCreator } from 'zustand'
import { VideoAgentProject } from './types'

export interface ScriptAnalysisActions {
  analyzeScript: () => Promise<void>
}

export type ScriptAnalysisSlice = ScriptAnalysisActions

export const createScriptAnalysisSlice: StateCreator<
  ScriptAnalysisSlice & {
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
  ScriptAnalysisSlice
> = (set, get) => ({
  // 分析脚本
  analyzeScript: async () => {
    const { currentProject } = get()
    if (!currentProject) {
      throw new Error('当前没有项目')
    }

    set({ isLoading: true, error: null })

    try {
      const response = await fetch(
        `/api/video-agent/projects/${currentProject.id}/analyze-script`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('脚本分析失败')
      }

      const { data: analysis } = await response.json()

      get().updateProject({
        script_analysis: analysis,
        current_step: 2,
        step_1_status: 'completed'
      })

      get().goToStep(2)
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

/**
 * Video Agent - 主入口
 * 组合所有 slice 并导出统一的 store
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { createProjectSlice, ProjectSlice } from './project-store'
import { createStepNavigationSlice, StepNavigationSlice } from './step-navigation'
import { createScriptAnalysisSlice, ScriptAnalysisSlice } from './script-analysis'
import { createCharacterConfigSlice, CharacterConfigSlice } from './character-config'
import { createImageStyleSlice, ImageStyleSlice } from './image-style'
import { createStoryboardGenerationSlice, StoryboardGenerationSlice } from './storyboard-generation'
import { createVideoGenerationSlice, VideoGenerationSlice } from './video-generation'
import { createVideoCompositionSlice, VideoCompositionSlice } from './video-composition'
import { createUtilsSlice, UtilsSlice } from './utils'

// 导出所有类型
export * from './types'

// 组合所有 slice 的类型
export type VideoAgentStore = ProjectSlice &
  StepNavigationSlice &
  ScriptAnalysisSlice &
  CharacterConfigSlice &
  ImageStyleSlice &
  StoryboardGenerationSlice &
  VideoGenerationSlice &
  VideoCompositionSlice &
  UtilsSlice

// 创建 store
export const useVideoAgentStore = create<VideoAgentStore>()(
  persist(
    (...a) => ({
      ...createProjectSlice(...a),
      ...createStepNavigationSlice(...a),
      ...createScriptAnalysisSlice(...a),
      ...createCharacterConfigSlice(...a),
      ...createImageStyleSlice(...a),
      ...createStoryboardGenerationSlice(...a),
      ...createVideoGenerationSlice(...a),
      ...createVideoCompositionSlice(...a),
      ...createUtilsSlice(...a)
    }),
    {
      name: 'video-agent-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        currentStep: state.currentStep
      })
    }
  )
)

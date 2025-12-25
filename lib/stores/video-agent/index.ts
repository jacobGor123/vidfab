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
        // ⚠️ 性能：避免持久化超大对象（script_analysis/shots、storyboards、video_clips 等）
        // 这些数据要么可以从 API 重新拉取，要么会导致 localStorage 序列化卡顿。
        currentProject: state.currentProject
          ? {
              id: state.currentProject.id,
              user_id: state.currentProject.user_id,
              status: state.currentProject.status,
              current_step: state.currentProject.current_step,

              step_1_status: state.currentProject.step_1_status,
              step_2_status: state.currentProject.step_2_status,
              step_3_status: state.currentProject.step_3_status,
              step_4_status: state.currentProject.step_4_status,
              step_5_status: state.currentProject.step_5_status,
              step_6_status: state.currentProject.step_6_status,
              step_7_status: state.currentProject.step_7_status,

              duration: state.currentProject.duration,
              story_style: state.currentProject.story_style,
              original_script: state.currentProject.original_script,

              image_style_id: state.currentProject.image_style_id,

              music_source: state.currentProject.music_source,
              music_url: state.currentProject.music_url,
              music_storage_path: state.currentProject.music_storage_path,
              music_generation_prompt: state.currentProject.music_generation_prompt,
              suno_task_id: state.currentProject.suno_task_id,
              transition_effect: state.currentProject.transition_effect,
              transition_duration: state.currentProject.transition_duration,

              final_video: state.currentProject.final_video,

              regenerate_quota_remaining: state.currentProject.regenerate_quota_remaining,
              credits_used: state.currentProject.credits_used,

              created_at: state.currentProject.created_at,
              updated_at: state.currentProject.updated_at,
              completed_at: state.currentProject.completed_at
            }
          : null,
        currentStep: state.currentStep
      })
    }
  )
)

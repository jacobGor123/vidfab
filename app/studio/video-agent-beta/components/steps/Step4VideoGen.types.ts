/**
 * Step 4 Video Generation - Type Definitions
 */

import { VideoAgentProject, VideoClip } from '@/lib/stores/video-agent'

export interface Step4Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export interface VideoGenerationState {
  isGenerating: boolean
  hasStartedGeneration: boolean
  isInitializing: boolean
  videoClips: VideoClip[]
  error: string | null
  retryingShot: number | null
  customPrompts: Record<number, string>
  expandedPrompts: Record<number, boolean>
  isShowingConfirm: boolean
}

export interface VideoGenerationActions {
  handleGenerate: () => Promise<void>
  handleRetry: (shotNumber: number) => Promise<void>
  handleConfirm: () => Promise<void>
  getDefaultPrompt: (shotNumber: number) => string
  updateCustomPrompt: (shotNumber: number, prompt: string) => void
  togglePromptExpand: (shotNumber: number) => void
}

export interface DisplayVideoItem {
  shot_number: number
  status: 'pending' | 'generating' | 'success' | 'failed'
  video_url?: string
  duration?: number
  error_message?: string
}

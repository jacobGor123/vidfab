/**
 * Step 3 Storyboard Generation - Type Definitions
 */

import { VideoAgentProject, Storyboard } from '@/lib/stores/video-agent'

export interface Step3Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export interface StoryboardGenerationState {
  isGenerating: boolean
  hasStartedGeneration: boolean
  storyboards: Storyboard[]
  error: string | null
  regeneratingShot: number | null
  customPrompts: Record<number, string>
  expandedPrompts: Record<number, boolean>
  isShowingConfirm: boolean
}

export interface StoryboardGenerationActions {
  handleGenerate: () => Promise<void>
  handleRegenerate: (shotNumber: number) => Promise<void>
  handleConfirm: () => Promise<void>
  getDefaultPrompt: (shotNumber: number) => string
  updateCustomPrompt: (shotNumber: number, prompt: string) => void
  togglePromptExpand: (shotNumber: number) => void
}

export interface DisplayItem {
  shot_number: number
  status: 'pending' | 'generating' | 'success' | 'failed'
  image_url?: string
  error_message?: string
}

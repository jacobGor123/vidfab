/**
 * Video Agent - 工具函数
 * 清理、重置等辅助函数
 */

import { StateCreator } from 'zustand'

export interface UtilsActions {
  clearAllIntervals: () => void
  reset: () => void
}

export type UtilsSlice = UtilsActions

export const createUtilsSlice: StateCreator<
  UtilsSlice & {
    storyboardPollingInterval: NodeJS.Timeout | null
    videoPollingInterval: NodeJS.Timeout | null
    compositionPollingInterval: NodeJS.Timeout | null
    currentProject: any
    currentStep: number
    isLoading: boolean
    error: string | null
  },
  [],
  [],
  UtilsSlice
> = (set, get) => ({
  // 清除所有轮询定时器
  clearAllIntervals: () => {
    const {
      storyboardPollingInterval,
      videoPollingInterval,
      compositionPollingInterval
    } = get()

    if (storyboardPollingInterval) {
      clearInterval(storyboardPollingInterval)
    }
    if (videoPollingInterval) {
      clearInterval(videoPollingInterval)
    }
    if (compositionPollingInterval) {
      clearInterval(compositionPollingInterval)
    }

    set({
      storyboardPollingInterval: null,
      videoPollingInterval: null,
      compositionPollingInterval: null
    })
  },

  // 重置状态
  reset: () => {
    get().clearAllIntervals()

    set({
      currentProject: null,
      currentStep: 0,
      isLoading: false,
      error: null
    })
  }
})

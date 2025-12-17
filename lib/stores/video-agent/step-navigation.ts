/**
 * Video Agent - 步骤导航
 * 处理 7 个步骤之间的导航逻辑
 */

import { StateCreator } from 'zustand'

export interface StepNavigationState {
  currentStep: number
}

export interface StepNavigationActions {
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
}

export type StepNavigationSlice = StepNavigationState & StepNavigationActions

export const createStepNavigationSlice: StateCreator<
  StepNavigationSlice,
  [],
  [],
  StepNavigationSlice
> = (set) => ({
  // 初始状态
  currentStep: 1,

  // 下一步
  nextStep: () => {
    set(state => ({
      currentStep: Math.min(state.currentStep + 1, 7)
    }))
  },

  // 上一步
  previousStep: () => {
    set(state => ({
      currentStep: Math.max(state.currentStep - 1, 1)
    }))
  },

  // 跳转到指定步骤
  goToStep: (step) => {
    set({ currentStep: step })
  }
})

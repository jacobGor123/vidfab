/**
 * Video Agent - 步骤导航
 * 处理 7 个步骤之间的导航逻辑
 */

import { StateCreator } from 'zustand'
import { VideoAgentProject } from './types'

export interface StepNavigationState {
  currentStep: number
}

export interface StepNavigationActions {
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
  setCurrentStep: (step: number) => void  // 直接设置，不验证
  canGoToStep: (step: number) => boolean
  getStepStatus: (step: number) => 'pending' | 'processing' | 'completed' | 'failed' | undefined
}

export type StepNavigationSlice = StepNavigationState & StepNavigationActions

// 步骤状态映射辅助函数
const getStepStatusField = (step: number): keyof VideoAgentProject => {
  return `step_${step}_status` as keyof VideoAgentProject
}

export const createStepNavigationSlice: StateCreator<
  any, // 使用 any 以访问完整的 store state
  [],
  [],
  StepNavigationSlice
> = (set, get) => ({
  // 初始状态
  currentStep: 1,

  // 获取指定步骤的状态
  getStepStatus: (step: number) => {
    const state = get()
    const project = state.currentProject as VideoAgentProject | null
    if (!project) return undefined

    const statusField = getStepStatusField(step)
    return project[statusField] as 'pending' | 'processing' | 'completed' | 'failed' | undefined
  },

  // 检查是否可以跳转到指定步骤
  canGoToStep: (targetStep: number) => {
    const state = get()
    const currentProject = state.currentProject as VideoAgentProject | null

    if (!currentProject) return false
    if (targetStep < 1 || targetStep > 7) return false

    // 🔥 修复：基于步骤的实际完成状态判断，而不是基于 currentStep
    const targetStepStatus = get().getStepStatus(targetStep)

    // 可以跳转到已完成的步骤（查看模式）
    if (targetStepStatus === 'completed') return true

    // 可以跳转到真正的当前步骤（从数据库读取）
    const actualCurrentStep = currentProject.current_step || 1
    if (targetStep === actualCurrentStep) return true

    // 不能跳转到未完成的步骤
    return false
  },

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

  // 跳转到指定步骤（带验证）
  goToStep: (step: number) => {
    const canGo = get().canGoToStep(step)

    if (!canGo) {
      console.warn(`[StepNavigation] 无法跳转到步骤 ${step}`)
      return
    }

    console.log(`[StepNavigation] 跳转到步骤 ${step}`)
    set({ currentStep: step })
  },

  // 直接设置当前步骤（不验证，用于同步）
  setCurrentStep: (step: number) => {
    set({ currentStep: step })
  }
})

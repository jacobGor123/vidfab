/**
 * Video Agent Beta - 步骤弹窗容器
 * 包含 6 个步骤的弹窗导航和内容展示
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { VideoAgentProject, useVideoAgentStore } from '@/lib/stores/video-agent'
import ProgressBar from './ProgressBar'
import { X } from 'lucide-react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { toast } from 'sonner'

// 导入各个步骤组件
import Step1ScriptAnalysis from './steps/Step1ScriptAnalysis'
import Step2CharacterConfig from './steps/Step2CharacterConfig'
import Step3StoryboardGen from './steps/Step3StoryboardGen'
import Step4VideoGen from './steps/Step4VideoGen'
import Step6FinalCompose from './steps/Step6FinalCompose'
import ResetStepConfirmDialog from './ResetStepConfirmDialog'
import ErrorBoundary from './ErrorBoundary'

interface StepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: number
  project: VideoAgentProject
  onProjectUpdate: (updates: Partial<VideoAgentProject>) => void
}

const STEP_TITLES = {
  1: 'Script Analysis & Optimization',
  2: 'Character Configuration',
  3: 'Storyboard Generation',
  4: 'Video Clip Generation',
  5: 'Final Composition'
}

export default function StepDialog({
  open,
  onOpenChange,
  step,
  project,
  onProjectUpdate
}: StepDialogProps) {
  const { updateProjectStep, resetProjectFromStep } = useVideoAgentAPI()

  // 从 store 获取步骤导航方法
  const { getStepStatus, canGoToStep, goToStep: storeGoToStep, setCurrentStep: storeSetCurrentStep, resumeProject } = useVideoAgentStore()

  // 🔥 同步 project 到 store（这样 canGoToStep 才能正确工作）
  useEffect(() => {
    if (project) {
      resumeProject(project)
    }
  }, [project, resumeProject])

  // 重置确认对话框状态
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetTargetStep, setResetTargetStep] = useState<number | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // 性能观测：弹框首次打开到下一帧
  useEffect(() => {
    if (!open) return

    const openedAt = performance.now()
    requestAnimationFrame(() => {
      const costMs = performance.now() - openedAt
      console.log('[Perf][StepDialog] open->next frame (approx):', {
        projectId: project.id,
        costMs: Math.round(costMs)
      })
    })
  }, [open, project.id])

  // 向后兼容：旧项目的步骤 6-7 映射为新的步骤 5
  const normalizedStep = step >= 6 ? 5 : step
  const [currentStep, setCurrentStep] = useState(normalizedStep)

  // 同步 prop 变化（页面刷新时从数据库读取的 current_step）
  useEffect(() => {
    const normalized = step >= 6 ? 5 : step
    setCurrentStep(normalized)
  }, [step])

  // 构建步骤状态映射（用于 ProgressBar）
  const stepStatuses = useMemo(() => {
    const statuses: Record<number, 'pending' | 'processing' | 'completed' | 'failed' | undefined> = {}
    for (let i = 1; i <= 5; i++) {
      statuses[i] = getStepStatus(i)
    }
    return statuses
  }, [project, getStepStatus])

  const handleNext = async () => {
    const nextStep = Math.min(currentStep + 1, 5)
    setCurrentStep(nextStep)

    // 同步更新数据库的 current_step
    try {
      await updateProjectStep(project.id, nextStep)
    } catch (error) {
      console.error('Failed to update current_step:', error)
    }
  }

  const handleUpdateProject = (updates: Partial<VideoAgentProject>) => {
    onProjectUpdate(updates)
  }

  const handleComplete = () => {
    onOpenChange(false)
  }

  // 处理步骤点击（回溯查看或重新生成）
  const handleStepClick = async (targetStep: number) => {
    console.log(`[StepDialog] Attempting to navigate to step ${targetStep}`, {
      currentStep,
      targetStep,
      actualCurrentStep: project.current_step,
      canGo: canGoToStep(targetStep)
    })

    // 验证是否可以跳转
    if (!canGoToStep(targetStep)) {
      console.warn(`[StepDialog] Cannot navigate to step ${targetStep}`)
      toast.error('Cannot navigate to this step', {
        description: 'Please complete previous steps first'
      })
      return
    }

    // 🔥 修复：判断是否点击的是真正的当前步骤（从数据库读取）
    const actualCurrentStep = project.current_step || 1
    if (targetStep === actualCurrentStep) {
      console.log(`[StepDialog] Clicked actual current step ${targetStep}, showing reset confirmation`)
      setResetTargetStep(targetStep)
      setShowResetConfirm(true)
      return
    }

    // 🔥 否则，进入查看模式（只读模式，不修改数据库的 current_step）
    console.log(`[StepDialog] Entering view mode for step ${targetStep}`)

    // 只更新本地状态（用于显示）
    setCurrentStep(targetStep)

    // 显示提示
    toast.success(`Viewing ${STEP_TITLES[targetStep as keyof typeof STEP_TITLES]}`, {
      description: 'View-only mode',
      duration: 2000
    })
  }

  // 处理重置确认
  const handleResetConfirm = async () => {
    if (resetTargetStep === null) return

    console.log(`[StepDialog] Starting project reset from step ${resetTargetStep}`)
    setIsResetting(true)

    // 显示加载提示
    const loadingToast = toast.loading('Resetting project...', {
      description: 'This may take a few seconds'
    })

    try {
      // 调用 API 重置项目
      const result = await resetProjectFromStep(project.id, resetTargetStep)

      console.log(`[StepDialog] Reset successful`, result)

      // 更新本地项目数据
      if (result && result.project) {
        onProjectUpdate(result.project)
      }

      // 更新本地状态
      setCurrentStep(resetTargetStep)

      // 同步更新 store
      storeGoToStep(resetTargetStep)

      // 关闭加载提示，显示成功提示
      toast.success('Project reset successfully!', {
        id: loadingToast,
        description: `Restarted from ${STEP_TITLES[resetTargetStep as keyof typeof STEP_TITLES]}`,
        duration: 3000
      })

    } catch (error) {
      console.error('[StepDialog] Reset failed:', error)

      // 关闭加载提示，显示错误提示
      toast.error('Failed to reset project', {
        id: loadingToast,
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 4000
      })
    } finally {
      setIsResetting(false)
      setResetTargetStep(null)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1ScriptAnalysis
            project={project}
            onNext={handleNext}
            onUpdate={handleUpdateProject}
          />
        )
      case 2:
        return (
          <Step2CharacterConfig
            project={project}
            onNext={handleNext}
            onUpdate={handleUpdateProject}
          />
        )
      case 3:
        return (
          <Step3StoryboardGen
            project={project}
            onNext={handleNext}
            onUpdate={handleUpdateProject}
          />
        )
      case 4:
        return (
          <Step4VideoGen
            project={project}
            onNext={handleNext}
            onUpdate={handleUpdateProject}
          />
        )
      case 5:
        return (
          <Step6FinalCompose
            project={project}
            onComplete={handleComplete}
            onUpdate={handleUpdateProject}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* 重置确认对话框 */}
      {resetTargetStep !== null && (
        <ResetStepConfirmDialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          targetStep={resetTargetStep}
          stepName={STEP_TITLES[resetTargetStep as keyof typeof STEP_TITLES]}
          onConfirm={handleResetConfirm}
          isLoading={isResetting}
        />
      )}

      {/* 主弹窗 */}
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent
        showClose={false}
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-950/90 backdrop-blur-xl border-slate-800 shadow-2xl p-0 gap-0"
        onPointerDownOutside={(e) => {
          // 阻止点击外部关闭弹窗
          e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // 阻止 ESC 键关闭弹窗
          e.preventDefault()
        }}
      >
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-white">
              <span className="font-mono text-blue-400 opacity-60">0{currentStep}</span>
              <span className="h-4 w-[1px] bg-white/20" />
              <span className="font-medium tracking-wide">
                {STEP_TITLES[currentStep as keyof typeof STEP_TITLES]}
              </span>
              {project.status === 'processing' && (
                <span className="flex items-center gap-2 text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  Processing
                </span>
              )}
            </DialogTitle>

            {/* 关闭按钮 */}
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 进度条 */}
          <ProgressBar
            currentStep={currentStep}
            totalSteps={5}
            stepStatuses={stepStatuses}
            onStepClick={handleStepClick}
          />

          {/* 步骤内容 */}
          <div className="mt-2 min-h-[400px]">
            <ErrorBoundary>
              {renderStep()}
            </ErrorBoundary>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

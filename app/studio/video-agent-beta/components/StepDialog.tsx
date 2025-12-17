/**
 * Video Agent Beta - 步骤弹窗容器
 * 包含 6 个步骤的弹窗导航和内容展示
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import ProgressBar from './ProgressBar'

// 导入各个步骤组件
import Step1ScriptAnalysis from './steps/Step1ScriptAnalysis'
import Step2CharacterConfig from './steps/Step2CharacterConfig'
import Step3StoryboardGen from './steps/Step3StoryboardGen'
import Step4VideoGen from './steps/Step4VideoGen'
import Step6FinalCompose from './steps/Step6FinalCompose'

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
  const [currentStep, setCurrentStep] = useState(step)

  // 同步 prop 变化（页面刷新时从数据库读取的 current_step）
  useEffect(() => {
    setCurrentStep(step)
  }, [step])

  const handleNext = async () => {
    const nextStep = Math.min(currentStep + 1, 5)
    setCurrentStep(nextStep)

    // 同步更新数据库的 current_step
    try {
      await fetch(`/api/video-agent/projects/${project.id}/step`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_step: nextStep })
      })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-950/90 backdrop-blur-xl border-slate-800 shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="font-mono text-blue-400 opacity-60">0{currentStep}</span>
            <span className="h-4 w-[1px] bg-white/20" />
            <span className="font-medium tracking-wide">
              {STEP_TITLES[currentStep as keyof typeof STEP_TITLES]}
            </span>
            {project.status === 'processing' && (
              <span className="flex items-center gap-2 text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Processing
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 进度条 */}
          <ProgressBar currentStep={currentStep} totalSteps={5} />

          {/* 步骤内容 */}
          <div className="mt-2 min-h-[400px]">{renderStep()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

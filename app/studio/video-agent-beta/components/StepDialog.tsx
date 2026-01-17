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

// 新流程（3 步）- 2026-01-10 之后创建的项目
const NEW_STEP_TITLES = {
  1: 'Script Analysis & Setup',  // 包含人物生成 + 分镜生成
  2: 'Video Generation',          // 生成视频片段
  3: 'Final Composition'          // 合成最终视频
}

// 旧流程（5 步）- 2026-01-10 之前创建的项目
const OLD_STEP_TITLES = {
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
  // 判断是否使用新流程（3 步）
  const isNewProject = useMemo(() => {
    const cutoffDate = new Date('2026-01-10T00:00:00Z')
    const createdAt = new Date(project.created_at)
    return createdAt >= cutoffDate
  }, [project.created_at])

  // 获取步骤标题和总步骤数
  const stepTitles = isNewProject ? NEW_STEP_TITLES : OLD_STEP_TITLES
  const totalSteps = isNewProject ? 3 : 5

  // 🔥 修复：新流程项目直接使用 step（1-3），旧项目才需要映射
  // 新流程：1 = Script Analysis, 2 = Video Generation, 3 = Final Composition
  // 旧流程：1 = Script, 2 = Character, 3 = Storyboard, 4 = Video, 5 = Final
  const mapStepToNewFlow = (oldStep: number): number => {
    if (!isNewProject) return oldStep
    // 新流程项目：current_step 已经是 1-3 的格式，直接使用
    // 确保不超过 3
    return Math.max(1, Math.min(oldStep, 3))
  }

  const [currentStep, setCurrentStep] = useState(mapStepToNewFlow(step))

  // 同步 prop 变化（页面刷新时从数据库读取的 current_step）
  useEffect(() => {
    setCurrentStep(mapStepToNewFlow(step))
  }, [step])

  const handleNext = async () => {
    const nextStep = Math.min(currentStep + 1, totalSteps)
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
    // 新项目使用 3 步流程
    if (isNewProject) {
      switch (currentStep) {
        case 1:
          // Step 1: Script Analysis + Character Gen + Storyboard Gen
          return (
            <Step1ScriptAnalysis
              project={project}
              onNext={handleNext}
              onUpdate={handleUpdateProject}
            />
          )
        case 2:
          // Step 2: Video Generation
          return (
            <Step4VideoGen
              project={project}
              onNext={handleNext}
              onUpdate={handleUpdateProject}
            />
          )
        case 3:
          // Step 3: Final Composition
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

    // 旧项目使用 5 步流程
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
      <DialogContent className="w-[90vw] max-w-[1600px] h-[90vh] overflow-hidden bg-slate-950/90 backdrop-blur-xl border-slate-800 shadow-2xl p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="font-mono text-blue-400 opacity-60">0{currentStep}</span>
            <span className="h-4 w-[1px] bg-white/20" />
            <span className="font-medium tracking-wide">
              {stepTitles[currentStep as keyof typeof stepTitles]}
            </span>
            {project.status === 'processing' && (
              <span className="flex items-center gap-2 text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Processing
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 进度条 */}
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} isNewProject={isNewProject} />

          {/* 步骤内容 */}
          <div className="mt-2">{renderStep()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

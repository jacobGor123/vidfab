/**
 * Video Agent Beta - 步骤弹窗容器
 * 包含 6 个步骤的弹窗导航和内容展示
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { VideoAgentProject } from '@/lib/stores/video-agent'

// 导入各个步骤组件
import Step1ScriptAnalysis from './steps/Step1ScriptAnalysis'
import Step6FinalCompose from './steps/Step6FinalCompose'

interface StepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: number
  project: VideoAgentProject
  onProjectUpdate: (updates: Partial<VideoAgentProject>) => void
}

// New unified flow: Step 1 generates storyboards/videos, then immediately composes the final video.
// No step bar, no manual step switching, and no legacy step routing.

export default function StepDialog({
  open,
  onOpenChange,
  step,
  project,
  onProjectUpdate
}: StepDialogProps) {
  // Keep a stable callback identity so Radix Dialog/Presence isn't forced into a ref churn loop
  // when the parent recreates inline handlers each render.
  const onProjectUpdateRef = useRef(onProjectUpdate)
  useEffect(() => {
    onProjectUpdateRef.current = onProjectUpdate
  }, [onProjectUpdate])

  // We keep a local view switch so the UI can go from Step 1 -> Compose immediately.
  const [view, setView] = useState<'create' | 'compose'>('create')

  // If the project is already composing or completed, jump straight into compose view.
  useEffect(() => {
    const step6 = (project as any).step_6_status
    if (step6 === 'processing' || step6 === 'queued' || step6 === 'completed') {
      setView('compose')
    }
  }, [project])

  const goToCompose = () => {
    setView('compose')
  }

  const handleUpdateProject = (updates: Partial<VideoAgentProject>) => {
    onProjectUpdateRef.current(updates)
  }

  const handleComplete = () => {
    onOpenChange(false)
  }

  const renderView = () => {
    if (view === 'compose') {
      return (
        <Step6FinalCompose
          project={project}
          onComplete={handleComplete}
          onUpdate={handleUpdateProject}
        />
      )
    }

    return (
      <Step1ScriptAnalysis
        project={project}
        onNext={goToCompose}
        onUpdate={handleUpdateProject}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1600px] h-[90vh] overflow-hidden bg-slate-950/90 backdrop-blur-xl border-slate-800 shadow-2xl p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="font-medium tracking-wide">Video Agent</span>
            {project.status === 'processing' && (
              <span className="flex items-center gap-2 text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Processing
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Single-flow content */}
          <div className="mt-2">{renderView()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

  // 🔥 关闭确认弹框状态
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // 🔥 内部控制 Dialog 打开/关闭状态（用于拦截关闭操作）
  const [internalOpen, setInternalOpen] = useState(open)

  // 🔥 同步父组件的 open 状态到内部状态
  useEffect(() => {
    setInternalOpen(open)
  }, [open])

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

  // 🔥 拦截关闭事件，显示确认弹框（不改变 Dialog 状态）
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 用户尝试关闭弹框，只显示确认提示，不关闭 Dialog
      setShowCloseConfirm(true)
      // 不调用 onOpenChange，保持 Dialog 打开
    } else {
      // 打开操作直接传递给父组件
      onOpenChange(newOpen)
    }
  }

  // 🔥 确认关闭：通知父组件关闭 Dialog
  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    // 通知父组件关闭（父组件会改变 open prop，触发 useEffect 同步到 internalOpen）
    onOpenChange(false)
  }

  // 🔥 取消关闭：保持 Dialog 打开
  const handleCancelClose = () => {
    setShowCloseConfirm(false)
    // 不做任何操作，Dialog 保持打开
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
    <>
      <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-[1600px] h-[90vh] overflow-hidden bg-slate-950/90 backdrop-blur-xl border-slate-800 shadow-2xl p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => {
          // 🔥 阻止点击外部关闭，显示确认弹框
          e.preventDefault()
          setShowCloseConfirm(true)
        }}
        onEscapeKeyDown={(e) => {
          // 🔥 阻止 ESC 键关闭，显示确认弹框
          e.preventDefault()
          setShowCloseConfirm(true)
        }}
      >
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

    {/* 🔥 关闭确认弹框 */}
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Close Video Agent?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to close the Video Agent? Any unsaved progress may be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancelClose}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClose}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Close Video Agent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}

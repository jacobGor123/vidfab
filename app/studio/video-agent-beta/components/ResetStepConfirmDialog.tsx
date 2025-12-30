/**
 * Video Agent Beta - 重置步骤确认对话框
 * 用于确认是否从指定步骤重新开始（会清空后续数据）
 */

'use client'

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
import { AlertTriangle } from 'lucide-react'

interface ResetStepConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetStep: number
  stepName: string
  onConfirm: () => void
  isLoading?: boolean
}

const STEP_NAMES: Record<number, string> = {
  1: 'Script Analysis',
  2: 'Character Configuration',
  3: 'Storyboard Generation',
  4: 'Video Clip Generation',
  5: 'Final Composition'
}

export default function ResetStepConfirmDialog({
  open,
  onOpenChange,
  targetStep,
  stepName,
  onConfirm,
  isLoading = false
}: ResetStepConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const affectedSteps = Object.entries(STEP_NAMES)
    .filter(([step]) => parseInt(step) >= targetStep)
    .map(([, name]) => name)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-950/95 backdrop-blur-xl border-slate-800 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl text-white mb-2">
                Reset from Step {targetStep}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 text-sm space-y-3">
                <p>
                  You are about to reset the project from <strong className="text-white">{stepName}</strong>.
                </p>
                <p>
                  This will <strong className="text-amber-400">permanently delete</strong> all data from the following steps:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {affectedSteps.map((name, index) => (
                    <li key={index} className="text-slate-300">
                      {name}
                    </li>
                  ))}
                </ul>
                <p className="text-amber-400 font-medium">
                  ⚠️ This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Resetting...
              </span>
            ) : (
              'Reset Project'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

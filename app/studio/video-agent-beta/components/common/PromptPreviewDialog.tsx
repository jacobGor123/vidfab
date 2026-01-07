/**
 * Prompt Preview Dialog - 完整 Prompt 预览对话框
 * 显示最终发送给 AI 模型的完整 prompt
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PromptPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullPrompt: string
  shotNumber: number
  type?: 'storyboard' | 'video'
}

export function PromptPreviewDialog({
  open,
  onOpenChange,
  fullPrompt,
  shotNumber,
  type = 'storyboard'
}: PromptPreviewDialogProps) {
  // 分析 prompt 的组成部分
  const sections = analyzePrompt(fullPrompt, type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Full Prompt Preview - Shot {shotNumber}</DialogTitle>
          <DialogDescription>
            This is the complete prompt that will be sent to the AI model
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* 完整 Prompt 显示 */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Complete Prompt:
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              <pre className="text-xs p-4 bg-muted/50 rounded whitespace-pre-wrap font-mono leading-relaxed">
                {fullPrompt}
              </pre>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground p-3 bg-muted/30 rounded">
            <div>
              <span className="font-medium">Total characters:</span> {fullPrompt.length}
            </div>
            <div>
              <span className="font-medium">Words:</span> {fullPrompt.split(/\s+/).length}
            </div>
          </div>

          {/* 关键部分说明 */}
          <div className="space-y-3 p-4 bg-primary/5 border border-primary/10 rounded">
            <div className="font-medium text-sm">This prompt includes:</div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {sections.map((section, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">{section.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{section.title}</div>
                    {section.description && (
                      <div className="text-muted-foreground/80 mt-0.5">
                        {section.description}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 安全提示 */}
          <div className="text-xs p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-700 dark:text-yellow-400">
            <span className="font-medium">⚠️ Note:</span> The AI model may interpret this prompt
            differently based on various factors. Results may vary.
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 分析 prompt 的组成部分
 */
function analyzePrompt(prompt: string, type: 'storyboard' | 'video') {
  const sections = []

  if (type === 'storyboard') {
    // 分镜图的组成部分
    if (prompt.includes('CRITICAL REQUIREMENT')) {
      sections.push({
        icon: '🎯',
        title: 'Character Consistency Constraints',
        description: 'Ensures characters look exactly the same as reference images'
      })
    }

    if (prompt.includes('Scene:')) {
      sections.push({
        icon: '📝',
        title: 'Your Custom Scene Description',
        description: 'The main scene you described'
      })
    }

    if (prompt.includes('Camera:')) {
      sections.push({
        icon: '🎥',
        title: 'Camera Angle',
        description: 'Shot composition and framing'
      })
    }

    if (prompt.includes('Action:')) {
      sections.push({
        icon: '🎬',
        title: 'Character Actions',
        description: 'What characters are doing in this scene'
      })
    }

    if (prompt.includes('Mood:')) {
      sections.push({
        icon: '🎭',
        title: 'Mood & Atmosphere',
        description: 'Emotional tone and ambiance'
      })
    }

    if (prompt.includes('Style:')) {
      sections.push({
        icon: '🎨',
        title: 'Visual Style',
        description: 'Art style and rendering approach'
      })
    }

    if (prompt.includes('Each character should appear ONLY ONCE')) {
      sections.push({
        icon: '🚫',
        title: 'Duplication Prevention',
        description: 'Prevents characters from appearing multiple times'
      })
    }

    if (prompt.includes('High quality')) {
      sections.push({
        icon: '✨',
        title: 'Quality Requirements',
        description: 'Professional composition and rendering quality'
      })
    }
  } else if (type === 'video') {
    // 视频的组成部分
    if (prompt.includes('Maintain exact character appearance')) {
      sections.push({
        icon: '🎯',
        title: 'Character Consistency',
        description: 'Maintains character appearance from reference image'
      })
    }

    sections.push({
      icon: '📝',
      title: 'Scene Description',
      description: 'Your custom scene description'
    })

    sections.push({
      icon: '🎬',
      title: 'Character Action',
      description: 'What characters are doing in this scene'
    })

    if (prompt.includes('No text, no subtitles')) {
      sections.push({
        icon: '🚫',
        title: 'Subtitle Restrictions',
        description: 'Prevents unwanted text overlays in video'
      })
    }
  }

  // 如果没有检测到任何部分，返回通用说明
  if (sections.length === 0) {
    sections.push({
      icon: '📝',
      title: 'Complete Prompt',
      description: 'Your custom prompt will be used as-is'
    })
  }

  return sections
}

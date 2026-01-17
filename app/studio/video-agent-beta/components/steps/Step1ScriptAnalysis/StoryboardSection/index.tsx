/**
 * StoryboardSection Component
 *
 * 分镜生成区域主组件
 * 职责：
 * 1. 显示分镜卡片（带拖位图或已生成的图片）
 * 2. 提供“批量生成分镜图”按钮（用户手动触发）
 * 3. 触发编辑弹框
 */

'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Check, Film, Plus, Wand2 } from 'lucide-react'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { useStoryboardAutoGeneration } from './useStoryboardAutoGeneration'
import { StoryboardLoadingState } from './StoryboardLoadingState'
import { StoryboardCardEnhanced } from './StoryboardCardEnhanced'

interface StoryboardSectionProps {
  project: VideoAgentProject
  analysis: ScriptAnalysis
  onStatusChange: (status: 'idle' | 'generating' | 'completed' | 'failed') => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onEditClick: (shotNumber: number) => void
  onFieldChange: (shotNumber: number, field: 'description' | 'camera_angle' | 'mood', value: string) => void
  getFieldValue: (shotNumber: number, field: 'description' | 'camera_angle' | 'mood', originalValue: string) => string
  onDeleteShot?: (shotNumber: number) => void
  onAddShot?: () => void
}

export function StoryboardSection({
  project,
  analysis,
  onStatusChange,
  onUpdate,
  onEditClick,
  onFieldChange,
  getFieldValue,
  onDeleteShot,
  onAddShot
}: StoryboardSectionProps) {
  const {
    status,
    progress,
    storyboards,
    startGeneration,
    retryGeneration
  } = useStoryboardAutoGeneration(project, analysis)

  // 🔥 使用 ref 追踪最后通知的状态，避免重复调用
  const lastNotifiedStatusRef = useRef<string | null>(null)
  const hasStartedGenerationRef = useRef(false)

  // 向父组件同步状态（仅在状态真正变化时）
  useEffect(() => {
    if (lastNotifiedStatusRef.current !== status) {
      lastNotifiedStatusRef.current = status
      onStatusChange(status)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // 🔥 移除自动触发逻辑，改为用户手动点击按钮触发
  // 不再自动 startGeneration()

  // 🔥 检查是否有未生成图片的分镜（用于显示批量生成按钮）
  const hasUngeneratedStoryboards = analysis.shots.some(
    shot => !storyboards[shot.shot_number]?.image_url
  )

  // 检查是否所有分镜都已有图片
  const allStoryboardsGenerated = analysis.shots.every(
    shot => storyboards[shot.shot_number]?.image_url
  )

  // 🔥 同步 storyboards 数据到 project.storyboards，供 StoryboardEditDialog 使用
  const lastSyncedStoryboardsRef = useRef<string | null>(null)
  useEffect(() => {
    if (!storyboards || Object.keys(storyboards).length === 0) return

    // 转换为数组格式
    const projectStoryboards = Object.values(storyboards).filter(Boolean).map(sb => ({
      id: sb.id || `storyboard-${sb.shot_number}`,
      shot_number: sb.shot_number,
      image_url: sb.image_url,
      status: sb.status,
      error_message: sb.error_message,
      generation_attempts: sb.generation_attempts || 0
    }))

    // 检查是否有变化
    const syncKey = JSON.stringify(projectStoryboards.map(s => `${s.shot_number}-${s.image_url || 'none'}`).sort())
    if (lastSyncedStoryboardsRef.current !== syncKey && projectStoryboards.length > 0) {
      lastSyncedStoryboardsRef.current = syncKey
      onUpdate({ storyboards: projectStoryboards as any })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboards])

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Film className="w-5 h-5" />
          Storyboard Generation
          {allStoryboardsGenerated && (
            <Badge variant="outline" className="ml-2 bg-green-950/30 text-green-400 border-green-800">
              <Check className="w-3 h-3 mr-1" />
              All Generated
            </Badge>
          )}
        </h2>

        {/* 🔥 批量生成分镜图按钮 */}
        {hasUngeneratedStoryboards && status !== 'generating' && (
          <Button
            onClick={startGeneration}
            className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg"
          >
            <Wand2 className="w-4 h-4" />
            Generate All Storyboards
          </Button>
        )}

        {/* 生成中状态 */}
        {status === 'generating' && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm">Generating {progress.current}/{progress.total}...</span>
          </div>
        )}
      </div>

      {/* 🔥 始终显示分镜卡片（即使图片还没生成） */}
      <div className="space-y-6">
        {analysis.shots.map((shot) => (
          <StoryboardCardEnhanced
            key={shot.shot_number}
            shot={shot}
            storyboard={storyboards[shot.shot_number]}
            isGenerating={status === 'generating'}
            onEdit={() => onEditClick(shot.shot_number)}
            onDelete={onDeleteShot ? () => onDeleteShot(shot.shot_number) : undefined}
            onFieldChange={(field, value) =>
              onFieldChange(shot.shot_number, field, value)
            }
            getFieldValue={(field, originalValue) =>
              getFieldValue(shot.shot_number, field, originalValue)
            }
          />
        ))}

        {/* 添加新分镜按钮 */}
        {onAddShot && (
          <button
            onClick={onAddShot}
            className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:text-blue-400 transition-all duration-300 group"
          >
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-medium">Add New Shot</span>
          </button>
        )}
      </div>

      {/* 🔥 生成进度提示（悬浮在右下角） */}
      {status === 'generating' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-6 py-4 bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-lg shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Generating Storyboards...
                </div>
                <div className="text-xs text-slate-400">
                  {progress.current} / {progress.total} completed
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'failed' && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-medium text-destructive">
                    Storyboard Generation Failed
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    An error occurred while generating storyboard images.
                    Please try again.
                  </p>
                </div>
                <Button
                  onClick={retryGeneration}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Generation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

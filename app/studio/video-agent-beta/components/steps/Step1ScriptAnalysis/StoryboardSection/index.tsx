/**
 * StoryboardSection Component
 *
 * 分镜生成区域主组件 - 集成分镜图和视频生成
 * 职责：
 * 1. 显示分镜卡片（分镜图 + 视频）
 * 2. 提供"批量生成分镜图"按钮
 * 3. 提供"批量生成视频"按钮
 * 4. 触发编辑弹框
 */

'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Check, Film, Plus, Wand2, Video } from 'lucide-react'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { useStoryboardAutoGeneration } from './useStoryboardAutoGeneration'
import { useVideoGenerationIntegrated } from './useVideoGenerationIntegrated'
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
  onVideoStatusChange?: (canProceed: boolean) => void
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
  onAddShot,
  onVideoStatusChange
}: StoryboardSectionProps) {
  // 分镜图生成 Hook
  const {
    status: storyboardStatus,
    progress: storyboardProgress,
    storyboards,
    startGeneration: startStoryboardGeneration,
    retryGeneration: retryStoryboardGeneration
  } = useStoryboardAutoGeneration(project, analysis)

  // 视频生成 Hook
  const {
    videoClips,
    customPrompts,
    isGenerating: isVideoGenerating,
    generatingShots,
    generateSingleVideo,
    generateAllVideos,
    updateCustomPrompt,
    stats: videoStats,
    canProceed: videoCanProceed
  } = useVideoGenerationIntegrated({
    project,
    analysis,
    onUpdate
  })

  // 追踪状态变化
  const lastNotifiedStatusRef = useRef<string | null>(null)
  const lastVideoCanProceedRef = useRef<boolean | null>(null)

  // 向父组件同步分镜状态
  useEffect(() => {
    if (lastNotifiedStatusRef.current !== storyboardStatus) {
      lastNotifiedStatusRef.current = storyboardStatus
      onStatusChange(storyboardStatus)
    }
  }, [storyboardStatus, onStatusChange])

  // 向父组件同步视频状态
  useEffect(() => {
    if (lastVideoCanProceedRef.current !== videoCanProceed) {
      lastVideoCanProceedRef.current = videoCanProceed
      onVideoStatusChange?.(videoCanProceed)
    }
  }, [videoCanProceed, onVideoStatusChange])

  // 检查分镜图状态
  const hasUngeneratedStoryboards = analysis.shots.some(
    shot => !storyboards[shot.shot_number]?.image_url
  )
  const allStoryboardsGenerated = analysis.shots.every(
    shot => storyboards[shot.shot_number]?.image_url
  )

  // 检查视频状态
  const hasUngeneratedVideos = analysis.shots.some(
    shot => {
      const clip = videoClips[shot.shot_number]
      return !clip || clip.status !== 'success'
    }
  )
  const allVideosGenerated = videoStats.completed === videoStats.total && videoStats.total > 0

  // 同步 storyboards 数据到 project
  const lastSyncedStoryboardsRef = useRef<string | null>(null)
  useEffect(() => {
    if (!storyboards || Object.keys(storyboards).length === 0) return

    const projectStoryboards = Object.values(storyboards).filter(Boolean).map(sb => ({
      id: sb.id || `storyboard-${sb.shot_number}`,
      shot_number: sb.shot_number,
      image_url: sb.image_url,
      image_url_external: (sb as any).image_url_external,
      cdn_url: (sb as any).cdn_url,
      storage_status: (sb as any).storage_status,
      status: sb.status,
      error_message: sb.error_message,
      generation_attempts: sb.generation_attempts || 0,
      updated_at: sb.updated_at
    }))

    const syncKey = JSON.stringify(projectStoryboards.map(s => `${s.shot_number}-${s.image_url || 'none'}`).sort())
    if (lastSyncedStoryboardsRef.current !== syncKey && projectStoryboards.length > 0) {
      lastSyncedStoryboardsRef.current = syncKey
      onUpdate({ storyboards: projectStoryboards as any })
    }
  }, [storyboards, onUpdate])

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Film className="w-5 h-5" />
          Storyboard & Video
          {allStoryboardsGenerated && (
            <Badge variant="outline" className="ml-2 bg-green-950/30 text-green-400 border-green-800">
              <Check className="w-3 h-3 mr-1" />
              Storyboards Ready
            </Badge>
          )}
          {allVideosGenerated && (
            <Badge variant="outline" className="ml-2 bg-blue-950/30 text-blue-400 border-blue-800">
              <Check className="w-3 h-3 mr-1" />
              Videos Ready
            </Badge>
          )}
        </h2>

        {/* 批量操作按钮区 */}
        <div className="flex items-center gap-2">
          {/* 批量生成分镜按钮 */}
          {hasUngeneratedStoryboards && storyboardStatus !== 'generating' && (
            <Button
              onClick={startStoryboardGeneration}
              className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg"
            >
              <Wand2 className="w-4 h-4" />
              Generate Storyboards
            </Button>
          )}

          {/* 🔥 重新生成所有分镜按钮 - 当所有分镜已生成时显示 */}
          {allStoryboardsGenerated && storyboardStatus !== 'generating' && (
            <Button
              onClick={retryStoryboardGeneration}
              variant="outline"
              className="gap-2 border-violet-600 text-violet-400 hover:bg-violet-600/10"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All Storyboards
            </Button>
          )}

          {/* 批量生成视频按钮 */}
          {allStoryboardsGenerated && hasUngeneratedVideos && !isVideoGenerating && (
            <Button
              onClick={generateAllVideos}
              variant="outline"
              className="gap-2 border-blue-600 text-blue-400 hover:bg-blue-600/10"
            >
              <Video className="w-4 h-4" />
              Generate All Videos
            </Button>
          )}

          {/* 分镜生成中状态 */}
          {storyboardStatus === 'generating' && (
            <div className="flex items-center gap-2 text-violet-400">
              <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              <span className="text-sm">Storyboards {storyboardProgress.current}/{storyboardProgress.total}</span>
            </div>
          )}

          {/* 视频生成中状态 */}
          {isVideoGenerating && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-sm">Videos {videoStats.completed}/{videoStats.total}</span>
            </div>
          )}
        </div>
      </div>

      {/* 分镜卡片列表 */}
      <div className="space-y-4">
        {analysis.shots.map((shot) => (
          <StoryboardCardEnhanced
            key={shot.shot_number}
            shot={shot}
            storyboard={storyboards[shot.shot_number]}
            projectCharacters={project.characters}
            videoClip={videoClips[shot.shot_number]}
            isStoryboardGenerating={storyboardStatus === 'generating'}
            isVideoGenerating={generatingShots.has(shot.shot_number)}
            aspectRatio={project.aspect_ratio || '16:9'}
            customVideoPrompt={customPrompts[shot.shot_number]}
            onEdit={() => onEditClick(shot.shot_number)}
            onDelete={onDeleteShot ? () => onDeleteShot(shot.shot_number) : undefined}
            onFieldChange={(field, value) =>
              onFieldChange(shot.shot_number, field, value)
            }
            getFieldValue={(field, originalValue) =>
              getFieldValue(shot.shot_number, field, originalValue)
            }
            onGenerateVideo={(prompt) => generateSingleVideo(shot.shot_number, prompt)}
            onUpdateVideoPrompt={(prompt) => updateCustomPrompt(shot.shot_number, prompt)}
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

      {/* 生成进度浮动提示 */}
      {(storyboardStatus === 'generating' || isVideoGenerating) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-6 py-4 bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-lg shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  {storyboardStatus === 'generating' ? 'Generating Storyboards...' : 'Generating Videos...'}
                </div>
                <div className="text-xs text-slate-400">
                  {storyboardStatus === 'generating'
                    ? `${storyboardProgress.current} / ${storyboardProgress.total} completed`
                    : `${videoStats.completed} / ${videoStats.total} completed`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分镜生成失败状态 */}
      {storyboardStatus === 'failed' && (
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
                  </p>
                </div>
                <Button
                  onClick={retryStoryboardGeneration}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 视频生成统计 */}
      {videoStats.total > 0 && (
        <div className="flex items-center gap-4 text-sm text-slate-400 px-2">
          <span>Videos: {videoStats.completed}/{videoStats.total} completed</span>
          {videoStats.failed > 0 && (
            <span className="text-red-400">{videoStats.failed} failed</span>
          )}
          {videoStats.generating > 0 && (
            <span className="text-blue-400">{videoStats.generating} generating</span>
          )}
        </div>
      )}
    </div>
  )
}

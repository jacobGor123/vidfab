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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Check, Film, Plus, Wand2, Video } from 'lucide-react'
import { VideoAgentProject, ScriptAnalysis, Storyboard } from '@/lib/stores/video-agent'
import { useStoryboardAutoGeneration } from './useStoryboardAutoGeneration'
import { useVideoGenerationIntegrated } from './useVideoGenerationIntegrated'
import { StoryboardCardEnhanced } from './StoryboardCardEnhanced'
import { UpgradeDialog } from '@/components/subscription/upgrade-dialog'
import { showError } from '@/lib/utils/toast'

interface StoryboardSectionProps {
  project: VideoAgentProject
  analysis: ScriptAnalysis
  onStatusChange: (status: 'idle' | 'generating' | 'completed' | 'failed') => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onEditClick: (shotNumber: number) => void
  onFieldChange: (shotNumber: number, field: 'description', value: string) => void
  getFieldValue: (shotNumber: number, field: 'description', originalValue: string) => string
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
  // 🔥 升级对话框状态
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // 分镜图生成 Hook
  const {
    status: storyboardStatus,
    progress: storyboardProgress,
    storyboards,
    startGeneration: startStoryboardGeneration,
    retryGeneration: retryStoryboardGeneration,
    refresh: refreshStoryboards
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

  // 🔥 包装分镜生成函数，捕获 402 错误
  const handleStartStoryboardGeneration = async () => {
    try {
      await startStoryboardGeneration()
    } catch (error: any) {
      if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
        setShowUpgradeDialog(true)
      } else {
        showError(error.message || 'Failed to start generation')
      }
    }
  }

  const handleRetryStoryboardGeneration = async () => {
    try {
      await retryStoryboardGeneration()
    } catch (error: any) {
      if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
        setShowUpgradeDialog(true)
      } else {
        showError(error.message || 'Failed to retry generation')
      }
    }
  }

  // 🔥 包装视频生成函数，捕获 402 错误
  const handleGenerateAllVideos = async () => {
    try {
      await generateAllVideos()
    } catch (error: any) {
      if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
        setShowUpgradeDialog(true)
      }
      // 其他错误已经在 hook 中处理了
    }
  }

  const handleGenerateSingleVideo = async (shotNumber: number, prompt: string, duration?: number, resolution?: string) => {
    try {
      await generateSingleVideo(shotNumber, prompt, duration, resolution)
    } catch (error: any) {
      if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
        setShowUpgradeDialog(true)
      }
      // 其他错误已经在 hook 中处理了
    }
  }

  const storyboardsSyncKey = useMemo(() => {
    if (!Array.isArray(project.storyboards)) return ''
    return project.storyboards
      .map((s: any) => `${s.shot_number}-${s.updated_at || ''}-${s.image_url || ''}`)
      .join('|')
  }, [project.storyboards])

  // Ensure storyboard previews are refreshed after a single-shot regenerate.
  // Regenerate runs through a different API than the batch poll loop, so without this
  // the preview can stay stale until a full reload.
  useEffect(() => {
    if (!project.storyboards || project.storyboards.length === 0) return
    void refreshStoryboards()
  }, [storyboardsSyncKey, refreshStoryboards, project.storyboards])

  // 视频生成完成后刷新分镜图状态（获取 CDN URL 替换过期的外部 URL）
  const prevIsVideoGeneratingRef = useRef(false)
  useEffect(() => {
    if (prevIsVideoGeneratingRef.current && !isVideoGenerating) {
      void refreshStoryboards()
    }
    prevIsVideoGeneratingRef.current = isVideoGenerating
  }, [isVideoGenerating, refreshStoryboards])

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
  // 🔥 修复：使用三层 URL 回退判断（与 resolveStoryboardSrc 逻辑一致）
  // 避免 cdn_url 已设置但 image_url 为 null 时，误认为未生成
  const hasStoryboardImage = (sb: Storyboard | undefined) =>
    !!(sb?.cdn_url || sb?.image_url || sb?.image_url_external)

  const hasUngeneratedStoryboards = Array.isArray(analysis?.shots) && analysis.shots.some(
    shot => !hasStoryboardImage(storyboards[shot.shot_number])
  )
  // 允许部分失败的 shot（status === 'failed'）不阻塞整体完成判断
  // 用户可以对失败的 shot 单独重试，不影响已成功的 shot 继续生成视频
  const allStoryboardsGenerated = Array.isArray(analysis?.shots) && analysis.shots.every(
    shot => {
      const sb = storyboards[shot.shot_number]
      return hasStoryboardImage(sb) || sb?.status === 'failed'
    }
  )

  // 检查视频状态
  const hasUngeneratedVideos = Array.isArray(analysis?.shots) && analysis.shots.some(
    shot => {
      const clip = videoClips[shot.shot_number]
      return !clip || clip.status !== 'success'
    }
  )
  const allVideosGenerated = videoStats.completed === videoStats.total && videoStats.total > 0

  // 同步 storyboards 数据到 project
  const lastSyncedStoryboardsRef = useRef<string | null>(null)

  // 🔥 关键修复：使用 ref 存储 onUpdate，避免无限循环
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!storyboards || Object.keys(storyboards).length === 0) return

    // 🔥 关键修复：只在非生成状态时同步，避免生成过程中频繁触发
    if (storyboardStatus === 'generating') return

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
      onUpdateRef.current({ storyboards: projectStoryboards as any })
    }
  }, [storyboards, storyboardStatus])

  return (
    <div className="space-y-6">
      {/* Section Header - 响应式布局 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mt-8">
        {/* 标题和状态徽章 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold">
            Storyboard & Video
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {allStoryboardsGenerated && (
              <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-800">
                <Check className="w-3 h-3 mr-1" />
                Storyboards Ready
              </Badge>
            )}
            {allVideosGenerated && (
              <Badge variant="outline" className="bg-blue-950/30 text-blue-400 border-blue-800">
                <Check className="w-3 h-3 mr-1" />
                Videos Ready
              </Badge>
            )}
          </div>
        </div>

        {/* 批量操作按钮区 - 移动端垂直排列，桌面端横向排列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* 批量生成分镜按钮 */}
          {hasUngeneratedStoryboards && storyboardStatus !== 'generating' && (
            <Button
              onClick={handleStartStoryboardGeneration}
              className="gap-2 text-white font-bold rounded-xl h-10 bg-gradient-primary shadow-glow-primary"
            >
              <Wand2 className="w-4 h-4" />
              Generate All Storyboards
            </Button>
          )}

          {/* 🔥 重新生成所有分镜按钮 - 当所有分镜已生成时显示 */}
          {allStoryboardsGenerated && storyboardStatus !== 'generating' && (
            <Button
              onClick={handleRetryStoryboardGeneration}
              variant="outline"
              className="gap-2 border-white/20 text-white hover:bg-slate-800/50 hover:text-white rounded-xl h-10"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All Storyboards
            </Button>
          )}

          {/* 批量生成视频按钮 */}
          {allStoryboardsGenerated && hasUngeneratedVideos && !isVideoGenerating && (
            <Button
              onClick={handleGenerateAllVideos}
              variant="outline"
              className="gap-2 border-white/20 text-white hover:bg-slate-800/50 hover:text-white rounded-xl h-10"
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
        {Array.isArray(analysis?.shots) && analysis.shots.map((shot) => (
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
            onGenerateVideo={(prompt, duration, resolution) => handleGenerateSingleVideo(shot.shot_number, prompt, duration, resolution)}  // 🔥 传递 duration 和 resolution 参数，包装错误处理
            onUpdateVideoPrompt={(characterAction) => updateCustomPrompt(shot.shot_number, characterAction)}
          />
        ))}

        {/* 添加新分镜按钮 - 暂时隐藏 */}
        {false && onAddShot && (
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
                    : `${videoStats.completed} completed / ${videoStats.total - videoStats.completed} pending`
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
        <div className="flex items-center gap-4 text-sm px-2">
          <span className="text-slate-400">Videos: {videoStats.completed}/{videoStats.total} completed</span>

          {videoStats.generating > 0 && (
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {videoStats.generating} generating
            </span>
          )}

          {(videoStats.total - videoStats.completed - videoStats.failed - videoStats.generating) > 0 && (
            <span className="text-slate-500">
              {videoStats.total - videoStats.completed - videoStats.failed - videoStats.generating} waiting
            </span>
          )}

          {videoStats.failed > 0 && (
            <span className="text-red-400">{videoStats.failed} failed</span>
          )}
        </div>
      )}

      {/* 🔥 升级对话框 */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </div>
  )
}

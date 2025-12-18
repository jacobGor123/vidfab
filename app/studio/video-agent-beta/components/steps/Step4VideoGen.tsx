/**
 * Step 5: Video Clip Generation
 * 生成视频片段，支持重试
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoAgentProject, VideoClip } from '@/lib/stores/video-agent'
import { RefreshCw } from 'lucide-react'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'

interface Step5Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step5VideoGen({ project, onNext, onUpdate }: Step5Props) {
  // 如果数据库有 video_clips，说明已开始过生成
  const hasExistingClips = Array.isArray(project.video_clips) && project.video_clips.length > 0
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasStartedGeneration, setHasStartedGeneration] = useState(hasExistingClips)
  const [videoClips, setVideoClips] = useState<VideoClip[]>(
    Array.isArray(project.video_clips) ? project.video_clips : []
  )
  const [error, setError] = useState<string | null>(null)
  const [retryingShot, setRetryingShot] = useState<number | null>(null)
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({})  // 存储每个 shot 的自定义 prompt
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({})  // 控制 prompt 输入框展开/收起

  const totalShots = project.script_analysis?.shot_count || 0
  const completedShots = Array.isArray(videoClips) ? videoClips.filter((vc) => vc.status === 'success').length : 0
  const failedShots = Array.isArray(videoClips) ? videoClips.filter((vc) => vc.status === 'failed').length : 0
  const generatingShots = Array.isArray(videoClips) ? videoClips.filter((vc) => vc.status === 'generating').length : 0

  // 根据项目尺寸比决定容器 aspect ratio
  const aspectRatioClass = project.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'

  // 页面加载时，如果有正在生成的视频，自动开始轮询
  useEffect(() => {
    if (generatingShots > 0 && !isGenerating) {
      console.log('[Step4] Resuming polling for generating videos:', generatingShots)
      setIsGenerating(true)
    }
  }, []) // 只在组件挂载时执行一次

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/videos/status`)

      if (!response.ok) return

      const { data } = await response.json()

      // 只有当返回数据不为空时才更新
      if (data && data.length > 0) {
        setVideoClips(data)
        onUpdate({ video_clips: data })
      }

      // 检查是否全部完成
      const allDone = data && data.length > 0 && data.every((vc: VideoClip) =>
        vc.status === 'success' || vc.status === 'failed'
      )

      if (allDone) {
        setIsGenerating(false)
      }
    } catch (err) {
      console.error('Failed to poll video status:', err)
    }
  }, [project.id, onUpdate])

  // 启动轮询 - 修改：一旦开始生成就持续轮询，直到全部完成
  useEffect(() => {
    if (isGenerating) {
      // 立即轮询一次
      pollStatus()

      // 然后每2秒轮询一次（改为更频繁的轮询）
      const interval = setInterval(pollStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [isGenerating, pollStatus])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setHasStartedGeneration(true) // 标记已开始生成
    setError(null)

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/videos/generate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate videos')
      }

      // 开始轮询（useEffect 会自动触发）
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
      setHasStartedGeneration(false)
    }
  }

  const handleRetry = async (shotNumber: number) => {
    setRetryingShot(shotNumber)
    setError(null)

    const dismissLoading = showLoading(`Regenerating video ${shotNumber}...`)
    try {
      // 获取自定义 prompt（如果用户修改过）
      const customPrompt = customPrompts[shotNumber]

      const response = await fetch(
        `/api/video-agent/projects/${project.id}/videos/${shotNumber}/retry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customPrompt: customPrompt || undefined  // 如果有自定义 prompt 就传递
          })
        }
      )

      dismissLoading()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to retry video generation')
      }

      // 更新状态为 generating
      setVideoClips((prev) =>
        prev.map((vc) =>
          vc.shot_number === shotNumber ? { ...vc, status: 'generating', error_message: null } : vc
        )
      )

      showSuccess(`Video ${shotNumber} regeneration started`)
      // 开始轮询
      setIsGenerating(true)
      pollStatus()
    } catch (err: any) {
      dismissLoading()
      setError(err.message)
      showError(err.message)
    } finally {
      setRetryingShot(null)
    }
  }

  // 获取默认 prompt（description + character_action）
  const getDefaultPrompt = (shotNumber: number): string => {
    const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
    if (!shot) return ''
    return `${shot.description}. ${shot.character_action}`
  }

  // 切换 prompt 输入框展开/收起
  const togglePromptExpand = (shotNumber: number) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [shotNumber]: !prev[shotNumber]
    }))
  }

  // 更新自定义 prompt
  const updateCustomPrompt = (shotNumber: number, prompt: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [shotNumber]: prompt
    }))
  }

  const handleConfirm = async () => {
    if (failedShots > 0) {
      const confirmed = await showConfirm(
        `${failedShots} videos failed. Continue anyway?`,
        {
          title: 'Videos Failed',
          confirmText: 'Continue',
          cancelText: 'Cancel'
        }
      )
      if (!confirmed) {
        return
      }
    }
    // 不需要手动更新 current_step，handleNext 会自动更新数据库
    onNext()
  }

  // 自动开始生成（删除确认步骤）
  useEffect(() => {
    if (!hasStartedGeneration && videoClips.length === 0 && !isGenerating) {
      console.log('[Step4] Auto-starting video generation (skip confirmation)')
      handleGenerate()
    }
  }, [hasStartedGeneration, videoClips.length, isGenerating])

  // 初始状态：未生成且从未开始过生成
  if (!hasStartedGeneration && videoClips.length === 0 && !isGenerating) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-xl font-bold mb-2">Generate Video Clips</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Transform your storyboards into video clips. We&apos;ll generate {totalShots} video
            segments based on your storyboards.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Clips</span>
                <span className="font-bold">{totalShots}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="font-bold">{Math.ceil(totalShots * 30)} seconds</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="font-bold">{project.duration}s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="text-xl">⚠️</div>
              <div className="flex-1 text-sm">
                <p className="font-semibold mb-1">Video Generation Time</p>
                <p className="text-muted-foreground">
                  Video generation takes longer than storyboards. Each clip may take 20-40 seconds
                  to generate. Please be patient.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {project.enable_narration && (
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="text-xl">🎙️</div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold mb-1 text-purple-400">Narration Enabled</p>
                  <p className="text-muted-foreground">
                    Videos will be generated with AI voiceover narration using Veo 3.1. This may take slightly longer but will include professional storytelling audio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={handleGenerate} size="lg" className="px-12">
            Generate Videos
          </Button>
        </div>
      </div>
    )
  }

  // 生成中或已完成
  const progress = totalShots > 0 ? (completedShots / totalShots) * 100 : 0

  // 创建占位数组 - 始终显示 totalShots 个卡片
  const displayItems = Array.from({ length: totalShots }, (_, index) => {
    const shotNumber = index + 1
    const clip = videoClips.find(vc => vc.shot_number === shotNumber)
    return clip || { shot_number: shotNumber, status: 'pending' as const }
  })

  return (
    <div className="space-y-6">
      {/* 进度概览 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Generation Progress</h3>
            <span className="text-sm font-bold">
              {completedShots} / {totalShots}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>{completedShots} Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>{generatingShots} Generating</span>
            </div>
            {failedShots > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span>{failedShots} Failed</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 视频网格 - 使用占位符确保高度稳定 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayItems.map((item) => (
          <Card key={item.shot_number} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`relative ${aspectRatioClass} bg-muted`}>
                {item.status === 'pending' ? (
                  // 骨架屏占位
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-muted-foreground/20 border-t-muted-foreground/40 rounded-full animate-pulse mx-auto mb-2" />
                      <div className="text-xs text-muted-foreground/60">Waiting...</div>
                    </div>
                  </div>
                ) : item.status === 'generating' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                      <div className="text-xs text-muted-foreground">Generating...</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This may take 30-60s
                      </div>
                    </div>
                  </div>
                ) : item.status === 'success' && 'video_url' in item && item.video_url ? (
                  <video
                    src={item.video_url}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2">❌</div>
                      <div className="text-xs text-destructive">Failed</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                {/* 标题行 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Shot {item.shot_number}</span>
                </div>

                {/* 操作按钮行 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePromptExpand(item.shot_number)}
                    className="flex-1 text-xs text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors"
                    title={expandedPrompts[item.shot_number] ? "Hide prompt" : "Edit prompt"}
                  >
                    {expandedPrompts[item.shot_number] ? '▼ Prompt' : '▶ Prompt'}
                  </button>

                  {/* 重新生成按钮（仅在有视频时显示）*/}
                  {(item.status === 'success' || item.status === 'failed') && (
                    <button
                      onClick={() => handleRetry(item.shot_number)}
                      disabled={retryingShot === item.shot_number}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Regenerate this video"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${retryingShot === item.shot_number ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-medium">Retry</span>
                    </button>
                  )}
                </div>
                {item.status === 'success' && 'duration' in item && item.duration && (
                  <div className="text-xs text-muted-foreground">{item.duration}s</div>
                )}
                {'error_message' in item && item.error_message && (
                  <p className="text-xs text-destructive">{item.error_message}</p>
                )}

                {/* Prompt 输入框 */}
                {expandedPrompts[item.shot_number] && (
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-xs text-muted-foreground">Custom Prompt:</label>
                    <textarea
                      value={customPrompts[item.shot_number] || getDefaultPrompt(item.shot_number)}
                      onChange={(e) => updateCustomPrompt(item.shot_number, e.target.value)}
                      className="w-full text-xs p-2 bg-muted/50 border border-muted rounded resize-none focus:outline-none focus:border-primary"
                      rows={3}
                      placeholder="Enter custom prompt for video generation..."
                    />
                    <p className="text-xs text-muted-foreground/70">
                      Modify the prompt and click regenerate to create a new video
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 确认按钮 */}
      {!isGenerating && generatingShots === 0 && (
        <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center pt-8 pb-8 z-10">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
          >
            Confirm & Continue
          </Button>
        </div>
      )}
    </div>
  )
}

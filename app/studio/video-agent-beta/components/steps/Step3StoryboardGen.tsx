/**
 * Step 4: Storyboard Generation
 * 生成分镜图，支持重新生成
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoAgentProject, Storyboard } from '@/lib/stores/video-agent'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'

interface Step4Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step4StoryboardGen({ project, onNext, onUpdate }: Step4Props) {
  // 如果数据库有 storyboards，说明已开始过生成
  const hasExistingStoryboards = Array.isArray(project.storyboards) && project.storyboards.length > 0
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasStartedGeneration, setHasStartedGeneration] = useState(hasExistingStoryboards)
  const [storyboards, setStoryboards] = useState<Storyboard[]>(
    Array.isArray(project.storyboards) ? project.storyboards : []
  )
  const [error, setError] = useState<string | null>(null)
  const [regeneratingShot, setRegeneratingShot] = useState<number | null>(null)

  const totalShots = project.script_analysis?.shot_count || 0
  const completedShots = Array.isArray(storyboards) ? storyboards.filter((sb) => sb.status === 'success').length : 0
  const failedShots = Array.isArray(storyboards) ? storyboards.filter((sb) => sb.status === 'failed').length : 0
  const generatingShots = Array.isArray(storyboards) ? storyboards.filter((sb) => sb.status === 'generating').length : 0

  // 根据项目尺寸比决定容器 aspect ratio
  const aspectRatioClass = project.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'

  // 页面加载时，如果有正在生成的分镜，自动开始轮询
  useEffect(() => {
    if (generatingShots > 0 && !isGenerating) {
      console.log('[Step3] Resuming polling for generating storyboards:', generatingShots)
      setIsGenerating(true)
    }
  }, []) // 只在组件挂载时执行一次

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/storyboards/status`)

      if (!response.ok) return

      const { data } = await response.json()

      // 只有当返回数据不为空时才更新
      if (data && data.length > 0) {
        setStoryboards(data)
        onUpdate({ storyboards: data })
      }

      // 检查是否全部完成
      const allDone = data && data.length > 0 && data.every((sb: Storyboard) =>
        sb.status === 'success' || sb.status === 'failed'
      )

      if (allDone) {
        setIsGenerating(false)
      }
    } catch (err) {
      console.error('Failed to poll storyboard status:', err)
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
      const response = await fetch(`/api/video-agent/projects/${project.id}/storyboards/generate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate storyboards')
      }

      // 开始轮询（useEffect 会自动触发）
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
      setHasStartedGeneration(false)
    }
  }

  const handleRegenerate = async (shotNumber: number) => {
    setRegeneratingShot(shotNumber)
    setError(null)

    const dismissLoading = showLoading(`Regenerating storyboard ${shotNumber}...`)
    try {
      const response = await fetch(
        `/api/video-agent/projects/${project.id}/storyboards/${shotNumber}/regenerate`,
        { method: 'POST' }
      )

      dismissLoading()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate storyboard')
      }

      // 更新状态为 generating
      setStoryboards((prev) =>
        prev.map((sb) =>
          sb.shot_number === shotNumber ? { ...sb, status: 'generating' } : sb
        )
      )

      showSuccess(`Storyboard ${shotNumber} regeneration started`)
      // 开始轮询
      pollStatus()
    } catch (err: any) {
      dismissLoading()
      setError(err.message)
      showError(err.message)
    } finally {
      setRegeneratingShot(null)
    }
  }

  const handleConfirm = async () => {
    if (failedShots > 0) {
      const confirmed = await showConfirm(
        `${failedShots} storyboards failed. Continue anyway?`,
        {
          title: 'Storyboards Failed',
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
    if (!hasStartedGeneration && storyboards.length === 0 && !isGenerating) {
      console.log('[Step3] Auto-starting storyboard generation (skip confirmation)')
      handleGenerate()
    }
  }, [hasStartedGeneration, storyboards.length, isGenerating])

  // 初始状态：未生成且从未开始过生成
  if (!hasStartedGeneration && storyboards.length === 0 && !isGenerating) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎨</div>
          <h2 className="text-xl font-bold mb-2">Generate Storyboards</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Transform your script into visual storyboards. We&apos;ll generate {totalShots} images
            based on your shot breakdown.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Shots</span>
                <span className="font-bold">{totalShots}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="font-bold">{Math.ceil(totalShots * 10)} seconds</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Style</span>
                <span className="font-bold capitalize">{project.image_style_id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={handleGenerate} size="lg" className="px-12">
            Generate Storyboards
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
    const storyboard = storyboards.find(sb => sb.shot_number === shotNumber)
    return storyboard || { shot_number: shotNumber, status: 'pending' as const }
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
          {project.regenerate_quota_remaining !== undefined && (
            <div className="text-xs text-muted-foreground">
              Regenerate Quota: {project.regenerate_quota_remaining} remaining
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分镜网格 - 使用占位符确保高度稳定 */}
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
                    </div>
                  </div>
                ) : item.status === 'success' && 'image_url' in item && item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`Shot ${item.shot_number}`}
                    className="w-full h-full object-contain"
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Shot {item.shot_number}</span>
                  {item.status === 'success' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        const confirmed = await showConfirm(
                          'The current image will be replaced.',
                          {
                            title: 'Regenerate Storyboard',
                            confirmText: 'Regenerate',
                            cancelText: 'Cancel'
                          }
                        )
                        if (confirmed) {
                          handleRegenerate(item.shot_number)
                        }
                      }}
                      disabled={regeneratingShot === item.shot_number}
                    >
                      {regeneratingShot === item.shot_number ? (
                        <>
                          <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-1" />
                          Regenerating
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Regenerate
                        </>
                      )}
                    </Button>
                  )}
                  {item.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerate(item.shot_number)}
                      disabled={regeneratingShot === item.shot_number}
                    >
                      {regeneratingShot === item.shot_number ? 'Retrying...' : 'Retry'}
                    </Button>
                  )}
                </div>
                {'error_message' in item && item.error_message && (
                  <p className="text-xs text-destructive">{item.error_message}</p>
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

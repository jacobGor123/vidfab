/**
 * Step 7: Final Composition
 * 合成最终视频
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { cn } from '@/lib/utils'

interface Step7Props {
  project: VideoAgentProject
  onComplete: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

interface ComposeStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  message?: string
  finalVideo?: {
    url: string
    file_size: number
    resolution: string
    duration: number
  }
}

export default function Step7FinalCompose({ project, onComplete, onUpdate }: Step7Props) {
  const [isComposing, setIsComposing] = useState(false)
  const [composeStatus, setComposeStatus] = useState<ComposeStatus>({ status: 'pending' })
  const [error, setError] = useState<string | null>(null)
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  console.log('[Step6] Component render:', {
    projectId: project.id,
    step_6_status: project.step_6_status,
    composeStatus: composeStatus.status,
    hasFinalVideo: !!composeStatus.finalVideo
  })

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/compose/status`)

      if (!response.ok) return

      const { data } = await response.json()
      console.log('[Step6] Poll status response:', {
        status: data.status,
        hasFinalVideo: !!data.finalVideo,
        finalVideo: data.finalVideo
      })
      setComposeStatus(data)

      if (data.status === 'completed') {
        setIsComposing(false)
        setSimulatedProgress(100)
        onUpdate({
          final_video: data.finalVideo,
          status: 'completed',
          current_step: 5  // 修复：现在是步骤 5（Final Composition）
        })
      } else if (data.status === 'failed') {
        setIsComposing(false)
        setError(data.message || 'Video composition failed')
      }
    } catch (err) {
      console.error('Failed to poll compose status:', err)
    }
  }, [project.id, onUpdate])

  // 启动轮询
  useEffect(() => {
    if (isComposing || composeStatus.status === 'processing') {
      const interval = setInterval(pollStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [isComposing, composeStatus.status, pollStatus])

  // 组件初始化时检查项目状态
  useEffect(() => {
    // 如果项目已经完成，直接获取完成状态
    if (project.step_6_status === 'completed' && composeStatus.status !== 'completed') {
      console.log('[Step6] Detected completed status, fetching final video')
      pollStatus()
    } else if (project.step_6_status === 'processing' && !isComposing) {
      // 如果正在处理中，开始轮询
      console.log('[Step6] Detected processing status, starting polling')
      setComposeStatus({ status: 'processing', progress: 50 })
      setIsComposing(true)
    }
  }, [project.step_6_status, composeStatus.status, isComposing, pollStatus])

  // 模拟进度增长
  useEffect(() => {
    if (composeStatus.status === 'processing') {
      const progressInterval = setInterval(() => {
        setSimulatedProgress((prev) => {
          // 慢慢增长到 95%，最后 5% 等待实际完成
          if (prev < 95) {
            return Math.min(prev + Math.random() * 3, 95)
          }
          return prev
        })
      }, 1000)

      return () => clearInterval(progressInterval)
    }
  }, [composeStatus.status])

  const handleStartCompose = async () => {
    setIsComposing(true)
    setError(null)

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/compose`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start composition')
      }

      setComposeStatus({ status: 'processing', progress: 0 })
      setSimulatedProgress(0)
      pollStatus()
    } catch (err: any) {
      setError(err.message)
      setIsComposing(false)
    }
  }

  const handleDownload = () => {
    if (composeStatus.finalVideo?.url) {
      window.open(composeStatus.finalVideo.url, '_blank')
    }
  }

  const handleComplete = () => {
    onUpdate({ status: 'completed' })
    onComplete()
  }

  // 初始状态：未开始合成
  if (composeStatus.status === 'pending') {
    return (
      <div className="space-y-8">
        {/* Composition Summary */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-indigo-500" />
              Composition Summary
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                <span className="text-slate-400 text-sm">Total Clips</span>
                <span className="text-white font-mono font-bold">
                  {project.video_clips?.filter((v) => v.status === 'success').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                <span className="text-slate-400 text-sm">Total Duration</span>
                <span className="text-white font-mono font-bold">{project.duration}s</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                <span className="text-slate-400 text-sm">Transitions</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-white font-semibold capitalize">{project.transition_effect || 'fade'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                <span className="text-slate-400 text-sm">Background Music</span>
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", project.music_source === 'none' ? "bg-slate-500" : "bg-indigo-500")} />
                  <span className="text-white font-semibold">
                    {project.music_source === 'none' ? 'None' : 'Included'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
          <div className="text-xl">ℹ️</div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-200 mb-1">Estimated Time</p>
            <p className="text-blue-300/80 leading-relaxed">
              Video composition typically takes 30-90 seconds depending on complexity.
              Please do not close the window once started.
            </p>
          </div>
        </div>

        {/* Sticky Footer for Start Button */}
        <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center pt-8 pb-8 z-10">
          <Button
            onClick={handleStartCompose}
            disabled={isComposing}
            size="lg"
            className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
          >
            Start Composition
          </Button>
        </div>
      </div>
    )
  }

  // 合成中
  if (composeStatus.status === 'processing') {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold mb-2">Composing Your Video...</h3>
          <p className="text-muted-foreground">
            {composeStatus.message || 'This may take a minute or two'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Progress</span>
              <span className="text-sm font-bold">{Math.round(simulatedProgress)}%</span>
            </div>
            <Progress value={simulatedProgress} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="text-xl">⏳</div>
              <div className="flex-1 text-sm">
                <p className="font-semibold mb-1">Please Wait</p>
                <p className="text-muted-foreground">
                  Do not close this window. The composition process is running...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 合成完成
  console.log('[Step6] Render check:', {
    status: composeStatus.status,
    hasFinalVideo: !!composeStatus.finalVideo,
    finalVideo: composeStatus.finalVideo
  })

  if (composeStatus.status === 'completed' && composeStatus.finalVideo) {
    const { url, file_size, resolution, duration } = composeStatus.finalVideo
    const fileSizeMB = (file_size / (1024 * 1024)).toFixed(2)

    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Your Video is Ready!</h2>
        </div>

        {/* 视频预览 */}
        <Card>
          <CardContent className="p-0">
            <video src={url} controls className="w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* 视频信息 */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Video Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{duration}s</div>
                <div className="text-xs text-muted-foreground mt-1">Duration</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{resolution}</div>
                <div className="text-xs text-muted-foreground mt-1">Resolution</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{fileSizeMB}MB</div>
                <div className="text-xs text-muted-foreground mt-1">File Size</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center items-center gap-4 pt-8 pb-8 z-10">
          <Button
            onClick={handleDownload}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            Download Video
          </Button>
          <Button
            onClick={handleComplete}
            size="lg"
            className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
          >
            Complete Project
          </Button>
        </div>
      </div>
    )
  }

  // 合成失败
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold mb-2">Composition Failed</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {error || 'An unexpected error occurred during video composition'}
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={handleStartCompose} variant="outline" size="lg">
          Try Again
        </Button>
        <Button onClick={handleComplete} size="lg">
          Close
        </Button>
      </div>
    </div>
  )
}

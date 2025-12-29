/**
 * Step 7: Final Composition
 * 合成最终视频
 */

'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { cn } from '@/lib/utils'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

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
  const { getComposeStatus, composeVideo } = useVideoAgentAPI()
  const debugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('va_debug')

  const [isComposing, setIsComposing] = useState(false)
  const [composeStatus, setComposeStatus] = useState<ComposeStatus>({ status: 'pending' })
  const [error, setError] = useState<string | null>(null)
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  // 页面不可见时暂停定时器，避免后台占用主线程导致交互卡顿
  const [isPageVisible, setIsPageVisible] = useState(true)

  useEffect(() => {
    const update = () => setIsPageVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // 避免无变化轮询仍触发重渲染
  const lastPollSignatureRef = useRef<string>('')

  // 避免 simulatedProgress 每秒 setState 导致全组件重渲染，改为更低频且只在数值变化时更新
  const lastSimulatedProgressRef = useRef<number>(0)

  if (debugEnabled) {
    console.log('[VA_DEBUG][Step6] Component render:', {
      projectId: project.id,
      step_6_status: project.step_6_status,
      composeStatus: composeStatus.status,
      hasFinalVideo: !!composeStatus.finalVideo
    })
  }

  // 轮询状态
  const pollStatus = useCallback(async () => {
    if (!project.id) return

    try {
      const data = await getComposeStatus(project.id)

      const signature = `${data?.status || ''}:${data?.progress ?? ''}:${data?.message || ''}:${data?.finalVideo?.url || ''}`
      if (signature === lastPollSignatureRef.current) {
        return
      }
      lastPollSignatureRef.current = signature

      if (debugEnabled) {
        console.log('[VA_DEBUG][Step6] Poll status response:', {
          status: data.status,
          hasFinalVideo: !!data.finalVideo
        })
      }
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
  }, [project.id, onUpdate, getComposeStatus])

  // 启动轮询 - 🔥 优化：缩短轮询间隔到 2 秒，减少卡顿感
  useEffect(() => {
    if (!isPageVisible) return
    if (isComposing || composeStatus.status === 'processing') {
      // 立即轮询一次
      pollStatus()
      // 然后每 2 秒轮询一次（原来是 5 秒）
      const interval = setInterval(pollStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [isPageVisible, isComposing, composeStatus.status, pollStatus])

  // 组件初始化时检查项目状态
  useEffect(() => {
    // 如果项目已经完成，直接获取完成状态
    if (project.step_6_status === 'completed' && composeStatus.status !== 'completed') {
      if (debugEnabled) console.log('[VA_DEBUG][Step6] Detected completed status, fetching final video')
      pollStatus()
    } else if (project.step_6_status === 'processing' && !isComposing && composeStatus.status !== 'completed') {
      // 🔥 修复：只有在 composeStatus 不是 completed 时才设置为 processing
      // 避免轮询完成后，因为父组件状态更新延迟而重新设置为 processing
      if (debugEnabled) console.log('[VA_DEBUG][Step6] Detected processing status, starting polling')
      setComposeStatus({ status: 'processing', progress: 50 })
      setIsComposing(true)
      // 初始化模拟进度基准，避免从 0 频繁更新
      lastSimulatedProgressRef.current = 50
      setSimulatedProgress(50)
    }
  }, [project.step_6_status, composeStatus.status, isComposing, pollStatus])

  // 模拟进度增长 - 🔥 优化：继续增长到 98%，减少卡顿感
  useEffect(() => {
    if (!isPageVisible) return
    if (composeStatus.status === 'processing') {
      const progressInterval = setInterval(() => {
        const prev = lastSimulatedProgressRef.current
        let next = prev

        // 🔥 优化：慢慢增长到 98%（原来是 95%），最后 2% 等待实际完成
        // 95-98% 区间增长更慢，给用户更好的反馈
        if (prev < 90) {
          // 0-90%：正常增长速度
          next = Math.min(prev + Math.random() * 4, 90)
        } else if (prev < 98) {
          // 90-98%：放慢增长速度（模拟字幕渲染阶段）
          next = Math.min(prev + Math.random() * 1.5, 98)
        }
        // 98-100%：等待实际完成

        // 只在整数百分比发生变化时触发一次 setState（大幅降低重渲染频率）
        const prevInt = Math.round(prev)
        const nextInt = Math.round(next)
        lastSimulatedProgressRef.current = next
        if (nextInt !== prevInt) {
          setSimulatedProgress(next)
        }
      }, 400)

      return () => clearInterval(progressInterval)
    }
  }, [isPageVisible, composeStatus.status])

  const handleStartCompose = async () => {
    setIsComposing(true)
    setError(null)

    try {
      await composeVideo(project.id)

      setComposeStatus({ status: 'processing', progress: 0 })
      lastSimulatedProgressRef.current = 0
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

  // 🔥 优先级1：合成失败（明确的 failed 状态）
  if (composeStatus.status === 'failed') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold mb-2">Composition Failed</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {error || composeStatus.message || 'An unexpected error occurred during video composition'}
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

  // 🔥 优先级2：初始状态/未开始合成（pending 或其他未知状态）
  if (composeStatus.status === 'pending' ||
      (composeStatus.status !== 'processing' && composeStatus.status !== 'completed')) {
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

  // 🔥 优先级3：合成中
  if (composeStatus.status === 'processing') {
    // 🔥 根据进度显示不同的阶段提示
    const getProgressMessage = (progress: number) => {
      if (progress < 30) return 'Preparing video clips...'
      if (progress < 60) return 'Merging video segments...'
      if (progress < 85) return 'Adding transitions and effects...'
      if (progress < 95) return 'Rendering subtitles...'
      return 'Finalizing video...'
    }

    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold mb-2">Composing Your Video...</h3>
          <p className="text-muted-foreground">
            {composeStatus.message || getProgressMessage(simulatedProgress)}
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

  // 🔥 优先级4：合成完成
  if (debugEnabled) {
    console.log('[VA_DEBUG][Step6] Render check:', {
      status: composeStatus.status,
      hasFinalVideo: !!composeStatus.finalVideo
    })
  }

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
          <CardContent className="p-4">
            <div className="flex justify-center">
              <video
                src={url}
                controls
                className="w-full max-h-[500px] rounded-lg object-contain"
              />
            </div>
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

  // 🔥 Fallback: 不应该到达这里，但为了类型安全，返回 pending 状态
  console.warn('[Step6] Unexpected render state:', { status: composeStatus.status })
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <div className="inline-block w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-bold mb-2">Loading...</h3>
        <p className="text-muted-foreground">Initializing composition...</p>
      </div>
    </div>
  )
}

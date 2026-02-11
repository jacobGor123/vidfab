/**
 * Step 7: Final Composition
 * 合成最终视频
 */

'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { cn } from '@/lib/utils'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Step7Props {
  project: VideoAgentProject
  onComplete: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

interface ComposeStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  message?: string
  code?: string
  retryable?: boolean
  finalVideo?: {
    url: string
    file_size: number
    resolution: string
    duration: number
  }
}

export default function Step7FinalCompose({ project, onComplete, onUpdate }: Step7Props) {
  const { getComposeStatus, composeVideo, saveToAssets } = useVideoAgentAPI()
  const { toast } = useToast()
  const debugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('va_debug')

  const [isComposing, setIsComposing] = useState(false)
  const [composeStatus, setComposeStatus] = useState<ComposeStatus>({ status: 'pending' })
  const [error, setError] = useState<string | null>(null)
  const [simulatedProgress, setSimulatedProgress] = useState(0)
  const autoStartAttemptedRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

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
          status: 'completed'
        })
      } else if (data.status === 'failed') {
        setIsComposing(false)
        setError(data.message || 'Video composition failed')
      }
    } catch (err) {
      console.error('Failed to poll compose status:', err)
    }
  }, [project.id, onUpdate, getComposeStatus, debugEnabled])

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

  // 🔥 Sync with REAL backend progress
  useEffect(() => {
    if (composeStatus.progress && composeStatus.progress > 0) {
      const realProgress = composeStatus.progress

      // Update if backend is ahead
      if (realProgress > lastSimulatedProgressRef.current) {
        setSimulatedProgress(realProgress)
        lastSimulatedProgressRef.current = realProgress
      }
    }
  }, [composeStatus.progress])

  // Auto-start compose when entering this view to avoid the extra "Preparing" step.
  // If Step1 already started compose, the backend will be idempotent / return a useful error.
  useEffect(() => {
    if (!isPageVisible) return
    if (!project.id) return
    if (autoStartAttemptedRef.current) return
    if (composeStatus.status === 'completed' || composeStatus.status === 'failed') return

    autoStartAttemptedRef.current = true

      ; (async () => {
        // Always poll once first to pick up a queued/processing state set by Step1.
        await pollStatus()

        // If still not processing/completed, try to start compose.
        if (lastPollSignatureRef.current.startsWith('processing:') || lastPollSignatureRef.current.startsWith('completed:')) {
          return
        }

        setIsComposing(true)
        setComposeStatus({ status: 'processing', progress: 0 })
        lastSimulatedProgressRef.current = 0
        setSimulatedProgress(0)

        try {
          await composeVideo(project.id)
        } catch (err: any) {
          setIsComposing(false)
          setComposeStatus({ status: 'failed' })
          setError(err?.message || 'Failed to start composition')
        }
      })()
  }, [isPageVisible, project.id, composeStatus.status, pollStatus, composeVideo])

  // 模拟进度增长 - 🔥 优化：继续增长到 98%，减少卡顿感
  useEffect(() => {
    if (!isPageVisible) return
    if (composeStatus.status === 'processing') {
      const progressInterval = setInterval(() => {
        const prev = lastSimulatedProgressRef.current
        let next = prev

        // 🔥 优化：更慢的增长速度，适应长视频合成（90s+ 需要 3-5 分钟）
        if (prev < 90) {
          // 0-90%：慢速增长 (平均 0.5% / 0.8s => ~0.6%/s => 150s to 90%)
          next = Math.min(prev + Math.random() * 1, 90)
        } else if (prev < 99) {
          // 90-99%：极慢速度
          next = Math.min(prev + Math.random() * 0.2, 99)
        }

        // 只在整数百分比发生变化时触发一次 setState
        const prevInt = Math.round(prev)
        const nextInt = Math.round(next)
        lastSimulatedProgressRef.current = next
        if (nextInt !== prevInt) {
          setSimulatedProgress(next)
        }
      }, 800)

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
      setError(err?.message || 'Failed to start composition')
      setIsComposing(false)
    }
  }

  const handleDownload = async () => {
    if (!composeStatus.finalVideo?.url) return

    const videoUrl = composeStatus.finalVideo.url

    try {
      // 方法1：尝试直接 fetch（对于同源或允许 CORS 的 URL）
      const response = await fetch(videoUrl, {
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // 创建隐藏的 <a> 标签触发下载
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `vidfab-video-${project.id}.mp4`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 释放 Blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (err) {
      // 方法2：尝试使用 download 属性的链接（可能被浏览器阻止）
      try {
        const link = document.createElement('a')
        link.href = videoUrl
        link.download = `vidfab-video-${project.id}.mp4`
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (linkErr) {
        // 最后降级方案：直接打开新标签页
        window.open(videoUrl, '_blank')
      }
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)

    try {
      console.log('[Video Agent] 💾 Saving video to My Assets...')

      // 保存视频到 my-assets
      const result = await saveToAssets(project.id)

      console.log('[Video Agent] ✅ Video saved to My Assets', { videoId: result.videoId })

      // 标记为已保存
      setIsSaved(true)

      // 显示成功提示
      toast({
        title: '✨ Video saved successfully!',
        description: 'Your video has been added to My Assets.',
        variant: 'default',
      })

      // 更新项目状态为完成
      onUpdate({ status: 'completed' })

      // 延迟 1.5 秒后完成流程（让用户看到成功状态）
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      console.error('[Video Agent] ❌ Failed to save video to assets:', err)

      setIsSaving(false)

      // 显示错误提示
      toast({
        title: '❌ Save failed',
        description: 'Failed to save video to My Assets. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // 🔥 优先级1：合成失败（明确的 failed 状态）
  if (composeStatus.status === 'failed') {
    const isStuckQueued = composeStatus.code === 'COMPOSE_STUCK_QUEUED'
    const displayMessage = isStuckQueued
      ? 'Worker offline / 队列未消费'
      : (error || composeStatus.message || 'An unexpected error occurred during video composition')

    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold mb-2">Composition Failed</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {displayMessage}
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={() => pollStatus()} variant="secondary" size="lg">
            Refresh
          </Button>
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

  // 🔥 优先级2：进入该页后应自动开始合成；pending 状态直接复用 processing UI
  // to avoid an extra "Preparing" step and a second manual click.

  // 🔥 优先级3：合成中（pending 也走这段，避免出现无意义的中间页）
  if (composeStatus.status === 'processing' || composeStatus.status === 'pending') {
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

    // 格式化时长显示
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // 转换分辨率显示为简化格式
    const getResolutionDisplay = (res: string) => {
      // 如果已经是简化格式，直接返回
      if (res === '480p' || res === '720p' || res === '1080p') {
        return res
      }

      // 反向转换：从 1920x1080 转为 1080p
      if (res.includes('1920') || res.includes('1080')) {
        return '1080p'
      } else if (res.includes('1280') || res.includes('720')) {
        return '720p'
      } else if (res.includes('854') || res.includes('480')) {
        return '480p'
      }

      return res
    }

    return (
      <div className="flex flex-col h-full">
        {/* 标题 - 带图标 */}
        <div className="flex items-center justify-center gap-3 py-4 flex-shrink-0">
          <Image
            src="/logo/video-ready-icon.svg"
            alt="Video Ready"
            width={48}
            height={48}
          />
          <h2 className="text-2xl font-bold text-white">Your Video is Ready!</h2>
        </div>

        {/* 左右布局：视频预览 + 详情/按钮 */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* 左侧：视频预览 */}
          <div className="flex-1 flex items-stretch">
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 w-full flex items-center justify-center">
              <video
                src={url}
                controls
                className="w-full h-full object-contain bg-black"
                style={{ maxHeight: '100%' }}
              />
            </div>
          </div>

          {/* 右侧：Video Details + 按钮组 */}
          <div className="w-[400px] flex flex-col gap-4">
            {/* Video Details - 填充剩余空间 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Video Details</h3>

              <div className="space-y-3 text-sm flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Ratio:</span>
                  <span className="text-white">{project.aspect_ratio || '16:9'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="text-white">{getResolutionDisplay(resolution)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Style:</span>
                  <span className="text-white">{project.story_style || 'Realistic'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Format:</span>
                  <span className="text-white">MP4</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 pt-4 border-t border-slate-800 mt-auto">
                You can download now,or complete the project to return to your workspace.
              </p>
            </div>

            {/* 按钮组 - 固定高度 */}
            <div className="space-y-3 flex-shrink-0">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full h-12 border-slate-700 text-white hover:bg-slate-800/50 hover:text-white rounded-xl"
              >
                Download Video
              </Button>
              {!isSaved && (
                <Button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="w-full h-14 text-white font-bold text-base transition-all rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: isSaving
                      ? 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)'
                      : 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)',
                    boxShadow: '0 8px 34px 0 rgba(115, 108, 255, 0.40)'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save to My Assets'
                  )}
                </Button>
              )}
            </div>
          </div>
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

"use client"

/**
 * Enhanced Text to Video Panel
 * 集成真实的视频生成功能，包括登录验证、轮询状态管理等
 */

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle } from "lucide-react"

// Hooks and services
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPolling } from "@/hooks/use-video-polling"
import { useVideoGenerationAuth } from "@/hooks/use-auth-modal"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { VideoResult } from "./video-result-enhanced"
import { VideoTaskGridItem } from "./video-task-grid-item"
import { VideoLimitDialog } from "./video-limit-dialog"

// Types
import { VideoGenerationRequest, DURATION_MAP } from "@/lib/types/video"

interface VideoGenerationParams {
  prompt: string
  model: string
  duration: string
  resolution: string
  aspectRatio: string
  style: string
}

interface VideoJobProgress {
  jobId: string
  status: string
  progress: number
  prompt: string
  settings: any
  startTime: number
}

export function TextToVideoPanelEnhanced() {
  const [params, setParams] = useState<VideoGenerationParams>({
    prompt: "",
    model: "vidu-q1",
    duration: "5s",
    resolution: "480p",
    aspectRatio: "16:9",
    style: "realistic"
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showLimitDialog, setShowLimitDialog] = useState(false)

  // Context and hooks
  const videoContext = useVideoContext()
  const authModal = useVideoGenerationAuth()

  // Video generation
  const videoGeneration = useVideoGeneration({
    onSuccess: (jobId) => {
      console.log(`Video generation started: ${jobId}`)
      startPolling(jobId)
    },
    onError: (error) => {
      console.error("Video generation failed:", error)
    },
    onAuthRequired: () => {
      authModal.showAuthModal()
    }
  })

  // Video polling
  const videoPolling = useVideoPolling({
    onCompleted: (job, resultUrl) => {
      console.log(`Video generation completed: ${job.id}`)
    },
    onFailed: (job, error) => {
      console.error(`Video generation failed: ${job.id}`, error)
    },
    onProgress: (job, progress) => {
      console.log(`Task progress updated: ${job.id} - ${progress}%`)
    }
  })

  const { startPolling, stopPolling, restartPolling } = videoPolling

  // 使用useSession获取用户信息
  const { data: session } = useSession()
  const currentUserId = session?.user?.uuid

  // 🔥 调试用户ID匹配问题
  console.log('🔑 Current user UUID from session:', currentUserId)
  console.log('🔑 All active jobs:', videoContext.activeJobs.map(job => ({
    id: job.id,
    userId: job.userId,
    status: job.status
  })))

  // Get current user's jobs - 只有当用户已登录时才显示数据
  const userJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : [] // 如果没有用户ID，不显示任何内容，避免闪现

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video => video.userId === currentUserId)
    : [] // 如果没有用户ID，不显示任何内容，避免闪现

  console.log('🔑 Filtered user jobs count:', userJobs.length)
  console.log('🔑 Filtered user videos count:', userVideos.length)

  // Resume polling on page load
  useEffect(() => {
    if (authModal.isAuthenticated && userJobs.length > 0) {
      console.log(`Resuming polling for ${userJobs.length} tasks`)
      userJobs.forEach(job => {
        if (job.status === "processing" && job.requestId) {
          startPolling(job.id)
        }
      })
    }
  }, [authModal.isAuthenticated, userJobs.length, startPolling])

  // Handle Vidfab Pro model selection
  useEffect(() => {
    if (params.model === "vidfab-pro") {
      // 自动设置为8秒和720p（如果当前不是支持的选项）
      setParams(prev => ({
        ...prev,
        duration: "8s",
        resolution: prev.resolution === "480p" ? "720p" : prev.resolution,  // 如果是480p则改为720p，否则保持
        // 移除强制设置 aspectRatio，保持用户选择
      }))
    }
  }, [params.model])

  // Form validation
  const validateForm = useCallback((): string[] => {
    const errors: string[] = []

    if (!params.prompt?.trim()) {
      errors.push("Please enter video description")
    }

    if (params.prompt && params.prompt.length > 500) {
      errors.push("Video description cannot exceed 500 characters")
    }

    if (!params.model) {
      errors.push("Please select generation model")
    }

    if (!params.duration) {
      errors.push("Please select video duration")
    }

    if (!params.resolution) {
      errors.push("Please select video resolution")
    }

    if (!params.aspectRatio) {
      errors.push("Please select aspect ratio")
    }

    return errors
  }, [params])

  // Generate video
  const handleGenerate = useCallback(async () => {
    // Check if user has reached the limit
    if (userJobs.length >= 20) {
      setShowLimitDialog(true)
      return
    }

    // Form validation
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])

    // Build request
    const request: VideoGenerationRequest = {
      prompt: params.prompt.trim(),
      model: params.model,
      duration: DURATION_MAP[params.duration] || 5,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio,
      seed: -1,
      cameraFixed: false
    }

    // Use auth hook to ensure user is logged in
    await authModal.requireAuth(async () => {
      await videoGeneration.generateVideo(request)
    })
  }, [params, validateForm, authModal, videoGeneration, userJobs.length])

  // Update form parameters
  const updateParam = useCallback((key: keyof VideoGenerationParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }))
    // Clear related validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }, [validationErrors.length])

  // Calculate current active jobs (processing only)
  const activeJobs = userJobs.filter(job => job.status === "processing" || job.status === "queued")
  const processingJobs = userJobs.filter(job => job.status === "processing")
  const hasActiveJobs = activeJobs.length > 0

  // 🔥 修复视频显示逻辑：检查activeJobs中已完成的job
  const completedJobsFromActive = userJobs.filter(job =>
    job.status === "completed" && job.resultUrl
  )

  // 🔥 调试：打印所有job状态
  console.log('🔍 All user jobs:', userJobs.map(job => ({
    id: job.id,
    status: job.status,
    resultUrl: job.resultUrl,
    progress: job.progress
  })))
  console.log('🔍 Completed jobs from active:', completedJobsFromActive)
  console.log('🔍 User videos from database:', userVideos)

  // 找到最新的已完成视频（只来自当前会话，不包括数据库历史视频）
  const latestCompletedJob = completedJobsFromActive[0] // Latest completed job from active jobs

  // 预览区域只显示当前会话中生成的视频，不显示历史视频
  const videoToShow = latestCompletedJob

  console.log('🎬 Video to show:', videoToShow)

  return (
    <>
      <div className="h-screen flex">
        {/* 左侧控制面板 */}
        <div className="w-1/2 h-full">
          <div className="h-full overflow-y-auto custom-scrollbar py-12 px-6 pr-3">
            <div className="space-y-6 min-h-[800px]">

              {/* Error display */}
              {(validationErrors.length > 0 || videoGeneration.error) && (
                <Alert className="border-red-800 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">
                    {validationErrors.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    ) : (
                      videoGeneration.error
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Video description input */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  <Textarea
                    placeholder="A majestic eagle soaring through mountain peaks at golden hour, cinematic style with dramatic lighting..."
                    value={params.prompt}
                    onChange={(e) => updateParam("prompt", e.target.value)}
                    className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
                    maxLength={500}
                    disabled={videoGeneration.isGenerating}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Detailed descriptions produce better results</span>
                    <span className={`${params.prompt.length > 450 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {params.prompt.length}/500
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Generation settings */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  {/* Model selection */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Model</Label>
                    <Select
                      value={params.model}
                      onValueChange={(value) => updateParam("model", value)}
                      disabled={videoGeneration.isGenerating}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="vidu-q1">Vidfab Q1 ⭐</SelectItem>
                        <SelectItem value="vidfab-pro">Vidfab Pro 🚀</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration and resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Duration</Label>
                      <Select
                        value={params.duration}
                        onValueChange={(value) => updateParam("duration", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {params.model === "vidfab-pro" ? (
                            <SelectItem value="8s">8 seconds</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="5s">5 seconds</SelectItem>
                              <SelectItem value="10s">10 seconds</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Resolution</Label>
                      <Select
                        value={params.resolution}
                        onValueChange={(value) => updateParam("resolution", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {params.model === "vidfab-pro" ? (
                            <>
                              <SelectItem value="720p">720p HD</SelectItem>
                              <SelectItem value="1080p">1080p Full HD</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="480p">480p</SelectItem>
                              <SelectItem value="720p">720p HD</SelectItem>
                              <SelectItem value="1080p">1080p Full HD</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Aspect ratio */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Aspect Ratio</Label>
                    <div className="flex gap-2">
                      {(params.model === "vidfab-pro" ? ["16:9", "9:16"] : ["16:9", "9:16", "1:1"]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => updateParam("aspectRatio", ratio)}
                          disabled={videoGeneration.isGenerating}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                            params.aspectRatio === ratio
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-800 text-gray-400 hover:bg-primary/80 hover:text-white"
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                    {params.model === "vidfab-pro" && (
                      <p className="text-xs text-gray-500">
                        Text-to-Video Vidfab Pro supports 16:9 and 9:16 aspect ratios
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!params.prompt.trim() || videoGeneration.isGenerating || authModal.isLoading || processingJobs.length >= 4}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {videoGeneration.isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : authModal.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Checking login...
                  </>
                ) : !authModal.isAuthenticated ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Sign In & Generate Video
                  </>
                ) : processingJobs.length >= 4 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Maximum 4 Videos at Once
                  </>
                ) : (
                  <>
                    Generate Video {processingJobs.length > 0 ? `(${processingJobs.length}/4)` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right preview area - Multi-task Grid Layout */}
        <div className="w-1/2 h-full overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 px-6 pb-20 pl-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
            {/* 显示所有用户的任务（进行中+已完成） */}
            {(userJobs.length > 0 || userVideos.length > 0) ? (
              <div
                className={`
                  grid gap-4
                  ${userJobs.length === 1 ? 'grid-cols-1' : ''}
                  ${userJobs.length === 2 ? 'grid-cols-2' : ''}
                  ${userJobs.length >= 3 ? 'grid-cols-2' : ''}
                `}
              >
                {/* 显示最多20个任务 */}
                {userJobs.slice(0, 20).map((job) => {
                  // 如果任务已完成，查找对应的视频
                  const completedVideo = job.status === 'completed' && job.resultUrl
                    ? {
                        id: job.id,
                        videoUrl: job.resultUrl,
                        prompt: job.prompt,
                        settings: job.settings,
                        userId: job.userId,
                        createdAt: job.createdAt
                      }
                    : userVideos.find(v => v.id === job.id)

                  return (
                    <VideoTaskGridItem
                      key={job.id}
                      job={job}
                      completedVideo={completedVideo as any}
                      onRegenerateClick={() => {
                        setParams({
                          prompt: job.prompt,
                          model: job.settings.model,
                          duration: job.settings.duration,
                          resolution: job.settings.resolution,
                          aspectRatio: job.settings.aspectRatio,
                          style: job.settings.style || "realistic"
                        })
                      }}
                    />
                  )
                })}

                {/* 如果没有当前任务但有当前会话的已完成视频，显示最新的一个 */}
                {userJobs.length === 0 && videoToShow && (
                  <VideoResult
                    videoUrl={videoToShow.resultUrl!}
                    thumbnailUrl={undefined}
                    prompt={videoToShow.prompt}
                    settings={{
                      model: videoToShow.settings.model,
                      duration: videoToShow.settings.duration,
                      resolution: videoToShow.settings.resolution,
                      aspectRatio: videoToShow.settings.aspectRatio,
                      style: videoToShow.settings.style || "realistic"
                    }}
                    onRegenerateClick={() => {
                      setParams({
                        prompt: videoToShow.prompt,
                        model: videoToShow.settings.model,
                        duration: videoToShow.settings.duration,
                        resolution: videoToShow.settings.resolution,
                        aspectRatio: videoToShow.settings.aspectRatio,
                        style: videoToShow.settings.style || "realistic"
                      })
                    }}
                    video={videoToShow}
                    isFromDatabase={false}
                    videoId={videoToShow.id}
                  />
                )}

              </div>
            ) : (
              <Card className="h-full bg-transparent border-none">
                <CardContent className="h-full flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center flex-col">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                      <Play className="w-8 h-8 text-gray-500 ml-1" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Preview Area</h3>
                    <p className="text-gray-500">Your generated video will appear here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Login modal */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 border-none bg-transparent max-w-md">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal />
        </DialogContent>
      </Dialog>

      {/* Video limit dialog */}
      <VideoLimitDialog open={showLimitDialog} onOpenChange={setShowLimitDialog} />
    </>
  )
}
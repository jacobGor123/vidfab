"use client"

/**
 * Video Task Grid Item Component
 * 宫格中的单个视频任务项
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VideoResult } from "./video-result-enhanced"
import { VideoJob, VideoResult as VideoResultType } from "@/lib/contexts/video-context"
import { useVideoContext } from "@/lib/contexts/video-context"
import { cn } from "@/lib/utils"
import { X, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 🔥 Error message translation function - English version
function getFriendlyErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'ImageObjectsUndetected': 'No clear objects detected in image. Please try using images with visible people, objects, or buildings',
    'InputTooLarge': 'File too large. Please use images smaller than 10MB',
    'InvalidImageFormat': 'Unsupported image format. Please use JPG, PNG, or WebP formats',
    'ContentPolicyViolation': 'Image content violates usage policy. Please select a different image',
    'ProcessingTimeout': 'Processing timeout. Please retry or use a smaller resolution image',
    'InsufficientCredits': 'Insufficient credits. Please top up your account and try again',
    'ImageTooSmall': 'Image resolution too low. Please use images of at least 512x512 pixels',
    'ImageTooBlurry': 'Image too blurry. Please use a higher quality, clearer image',
    'NoFaceDetected': 'No face detected. Please ensure image contains a clear human face',
    'MultipleFacesDetected': 'Multiple faces detected. Please use an image with only one person',
    'NetworkError': 'Network connection failed. Please check your connection and retry',
    'ServerError': 'Server temporarily unavailable. Please try again later',
    'RateLimitExceeded': 'Too many requests. Please wait a moment and try again',
    'UnknownError': 'Unknown error occurred. Please retry or contact support'
  }

  // Exact match
  if (errorMessages[error]) {
    return errorMessages[error]
  }

  // Fuzzy match
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message
    }
  }

  // Special keyword matching
  const errorLower = error.toLowerCase()
  if (errorLower.includes('object') && errorLower.includes('detect')) {
    return errorMessages['ImageObjectsUndetected']
  }
  if (errorLower.includes('face') && errorLower.includes('not')) {
    return errorMessages['NoFaceDetected']
  }
  if (errorLower.includes('multiple') && errorLower.includes('face')) {
    return errorMessages['MultipleFacesDetected']
  }
  if (errorLower.includes('blur') || errorLower.includes('quality')) {
    return errorMessages['ImageTooBlurry']
  }
  if (errorLower.includes('small') || errorLower.includes('resolution')) {
    return errorMessages['ImageTooSmall']
  }
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return errorMessages['NetworkError']
  }
  if (errorLower.includes('server')) {
    return errorMessages['ServerError']
  }
  if (errorLower.includes('rate') && errorLower.includes('limit')) {
    return errorMessages['RateLimitExceeded']
  }

  // Default return
  return error || 'Unknown error. Please try again with a different image'
}

interface VideoTaskGridItemProps {
  job?: VideoJob
  completedVideo?: VideoResultType
}

export function VideoTaskGridItem({
  job,
  completedVideo
}: VideoTaskGridItemProps) {
  const [progress, setProgress] = useState(0)
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const videoContext = useVideoContext()


  // 计算预期时长（秒）
  const estimatedDuration = useMemo(() => {
    if (!job) return 60
    const resolution = job.settings.resolution
    if (resolution === "1080p") return 90
    if (resolution === "720p") return 60
    return 30 // 480p
  }, [job])

  // 更新进度 - 使用实际进度或动画模拟
  useEffect(() => {
    if (!job || job.status !== "processing") return

    // 如果有实际进度，使用实际进度
    if (job.progress !== undefined && job.progress > 0) {
      setProgress(job.progress)
      return
    }

    // 否则使用动画模拟进度
    const createdTime = job.createdAt ? new Date(job.createdAt).getTime() : Date.now()
    const interval = setInterval(() => {
      const elapsed = (Date.now() - createdTime) / 1000 // 转换为秒
      const simulatedProgress = Math.min((elapsed / estimatedDuration) * 100, 90) // 最多到90%
      setAnimatedProgress(simulatedProgress)
    }, 500) // 每0.5秒更新一次

    return () => clearInterval(interval)
  }, [job, estimatedDuration])

  // Cancel processing task
  const handleCancelTask = useCallback(() => {
    if (!job?.id) return

    // Simply remove the job from active jobs list (cancels polling)
    videoContext.removeJob(job.id)
    toast.success('Task cancelled successfully')
    setShowDeleteConfirm(false)
  }, [job?.id, videoContext])

  // 🔥 关键修复：优先检查job的completed状态，确保轮询更新能立即显示
  if (completedVideo || (job?.status === "completed" && job.resultUrl)) {
    const videoUrl = completedVideo?.videoUrl || job?.resultUrl!
    const prompt = completedVideo?.prompt || job?.prompt!
    const settings = completedVideo?.settings || job?.settings!

    return (
      <VideoResult
        videoUrl={videoUrl}
        thumbnailUrl={completedVideo?.thumbnailUrl}
        prompt={prompt}
        settings={settings}
        video={completedVideo as any}
        isFromDatabase={!!completedVideo}
        videoId={completedVideo?.id || job?.id}
      />
    )
  }

  // If there's a processing task, show loading state
  if (job && (job.status === "processing" || job.status === "queued" || job.status === "pending")) {

    return (
      <Card className="h-full bg-gray-950 border-gray-800 relative">
        {/* Cancel button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-gray-900/90 hover:bg-red-600 text-gray-400 hover:text-white transition-all"
          title="Cancel task"
        >
          <X className="w-4 h-4" />
        </button>

        <CardContent className="h-full flex flex-col items-center justify-center p-6">
          <div className="flex items-center justify-center flex-col w-full">
            {/* Spinning loading icon */}
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Text hints */}
            <h3 className="text-sm font-semibold text-white mb-1">
              {job.status === "pending" ? "Preparing..." :
               job.status === "queued" ? "In Queue" :
               "Creating Your Video"}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {job.status === "pending" ? "Initializing video generation..." :
               job.status === "queued" ? "Waiting for processing slot..." :
               "This may take a few minutes..."}
            </p>

            {/* Green progress bar */}
            <div className="w-full max-w-[200px]">
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress || animatedProgress || 0, 95)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>

        {/* Cancel confirmation dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Cancel Task</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This will stop the video generation process. Are you sure you want to cancel?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700">
                Keep Processing
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelTask}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Cancel Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  // If there's a failed task, show error state
  if (job && job.status === "failed") {

    return (
      <Card className="h-full bg-gray-950 border-red-800/30 relative">
        <CardContent className="h-full flex flex-col items-center justify-center p-6">
          <div className="flex items-center justify-center flex-col w-full text-center">
            {/* Error icon */}
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Error text */}
            <h3 className="text-sm font-semibold text-red-300 mb-2">Generation Failed</h3>
            <p className="text-xs text-gray-400 mb-4 max-w-[200px] text-center">
              {getFriendlyErrorMessage(job.error || "Video generation failed")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }


  // 🔥 处理意外状态：如果任务存在但状态异常，当作处理中状态
  const validStatuses = ['pending', 'generating', 'processing', 'completed', 'failed', 'storing']
  if (job && !validStatuses.includes(job.status)) {

    return (
      <Card className="h-full bg-gray-950 border-purple-600/30 relative">
        <CardContent className="h-full flex flex-col items-center justify-center p-4">
          <div className="flex items-center justify-center flex-col w-full">
            {/* Loading animation */}
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Status text */}
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Video Processing</h3>
            <p className="text-xs text-gray-400 mb-4 text-center">
              Initializing video generation...
            </p>

            {/* Debug info */}
            <p className="text-xs text-gray-500 text-center">
              Status: {job.status || 'undefined'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 骨架屏动画状态 - 当没有任务信息时显示

  return (
    <Card className="h-full bg-gray-950 border-gray-800 overflow-hidden">
      <CardContent className="h-full p-0">
        <div className="relative h-full flex flex-col">
          {/* 模拟视频缩略图区域 */}
          <div className="flex-1 bg-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/20 to-transparent animate-shimmer" />

            {/* 模拟播放按钮 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-800/80 animate-pulse" />
            </div>
          </div>

          {/* 模拟进度条 */}
          <div className="px-3 py-2 bg-gray-950">
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600/30 rounded-full animate-pulse" />
            </div>
          </div>

          {/* 模拟文本内容 */}
          <div className="px-3 py-2 space-y-2">
            <div className="h-3 bg-gray-800 rounded animate-pulse" />
            <div className="h-2 bg-gray-800/60 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
"use client"

/**
 * Video Task Grid Item Component
 * 宫格中的单个视频任务项
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { VideoResult } from "./video-result-enhanced"
import { VideoJob, VideoResult as VideoResultType } from "@/lib/contexts/video-context"
import { useVideoContext } from "@/lib/contexts/video-context"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
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

interface VideoTaskGridItemProps {
  job?: VideoJob
  completedVideo?: VideoResultType
  onRegenerateClick?: () => void
}

export function VideoTaskGridItem({
  job,
  completedVideo,
  onRegenerateClick
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

  // Delete video task
  const handleDelete = useCallback(async () => {
    console.log('🗑️ Delete clicked:', { job, completedVideo })

    try {
      let deleted = false

      // Get the ID to delete (either from job or completedVideo)
      const deleteId = job?.id || completedVideo?.id

      if (!deleteId) {
        console.error('🗑️ No ID found to delete')
        toast.error('No video found to delete.')
        setShowDeleteConfirm(false)
        return
      }

      console.log('🗑️ Deleting video with ID:', deleteId)

      // Always try to remove from both places for completed videos
      if (job?.status === "completed" || completedVideo) {
        console.log('🗑️ Removing from both activeJobs and completedVideos')
        // Remove from activeJobs (if it exists there)
        videoContext.removeJob(deleteId)
        // Remove from completedVideos (if it exists there)
        videoContext.removeCompletedVideo(deleteId)
      }
      // For processing jobs, only remove from activeJobs
      else if (job?.status === "processing") {
        console.log('🗑️ Removing processing job from activeJobs only')
        videoContext.removeJob(deleteId)
      }
      // Fallback: try both just in case
      else {
        console.log('🗑️ Unknown state, removing from both locations')
        videoContext.removeJob(deleteId)
        videoContext.removeCompletedVideo(deleteId)
      }

      // Handle database deletion for UUID videos
      if (completedVideo?.id) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(completedVideo.id)
        if (isUUID) {
          console.log('🗑️ UUID detected, calling deleteVideo API')
          await videoContext.deleteVideo(completedVideo.id)
        }
      }

      deleted = true
      console.log('🗑️ Delete operation completed successfully')
      toast.success('Video deleted successfully!')

    } catch (error) {
      console.error('🗑️ Failed to delete video:', error)
      toast.error('Failed to delete video. Please try again.')
    }

    setShowDeleteConfirm(false)
  }, [job, completedVideo, videoContext])

  // If there's a completed video, show video result
  if (completedVideo || (job?.status === "completed" && job.resultUrl)) {
    const showDelete = true // Allow deleting completed videos
    const videoUrl = completedVideo?.videoUrl || job?.resultUrl!
    const prompt = completedVideo?.prompt || job?.prompt!
    const settings = completedVideo?.settings || job?.settings!

    return (
      <div className="relative">
        {/* Delete button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-gray-900/90 hover:bg-red-600 text-gray-400 hover:text-white transition-all"
          title="Delete video"
        >
          <X className="w-4 h-4" />
        </button>

        <VideoResult
        videoUrl={videoUrl}
        thumbnailUrl={completedVideo?.thumbnailUrl}
        prompt={prompt}
        settings={settings}
        onRegenerateClick={onRegenerateClick || (() => {})}
        video={completedVideo as any}
        isFromDatabase={!!completedVideo}
        videoId={completedVideo?.id || job?.id}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Video</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action will permanently delete this video and cannot be undone. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // If there's a processing task, show loading state
  if (job && (job.status === "processing" || job.status === "queued")) {
    return (
      <Card className="h-full bg-gray-950 border-gray-800 relative">
        {/* Delete button */}
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
            <h3 className="text-sm font-semibold text-white mb-1">Creating Your Video</h3>
            <p className="text-xs text-gray-400 mb-4">This may take a few minutes...</p>

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

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Cancel Task</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action will cancel the current video generation task. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700">
                Keep Processing
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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

  // 骨架屏动画状态 - 模拟视频加载中的样子
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
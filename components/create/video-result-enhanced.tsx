"use client"

/**
 * Enhanced Video Result Component
 * 增强版视频结果组件，支持真实视频播放、下载、分享等功能
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Download,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Copy,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UserVideo } from "@/lib/supabase"
import { toast } from "sonner"

interface VideoResultProps {
  videoUrl: string
  thumbnailUrl?: string
  prompt: string
  settings: {
    model: string
    duration: string
    resolution: string
    aspectRatio: string
    style?: string
  }
  videoId?: string
  // Database video data
  video?: UserVideo
  isFromDatabase?: boolean
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | undefined): boolean {
  return !!value && UUID_PATTERN.test(value)
}

function sanitizeFilenamePart(value: string | undefined): string {
  return (value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60_000)
}

function triggerDirectDownload(url: string, filename: string) {
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function VideoResult({
  videoUrl,
  thumbnailUrl,
  prompt,
  settings,
  videoId,
  video,
  isFromDatabase = false
}: VideoResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // 🔥 修复：默认不loading
  const [hasError, setHasError] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const videoContext = useVideoContext()

  const isExternalStoragePath =
    video?.storage_path?.startsWith("shotstack:") || false
  const actualVideoUrl =
    video?.storage_path && !isExternalStoragePath
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-videos/${video.storage_path}`
      : video?.original_url || videoUrl

  const downloadVideoId = isUuid(video?.id)
    ? video?.id
    : isUuid(videoId)
      ? videoId
      : undefined

  const downloadFilename = `vidfab-video-${sanitizeFilenamePart(downloadVideoId || videoId || video?.wavespeed_request_id) || "generated"}.mp4`
  const downloadEndpoint = downloadVideoId
    ? `/api/video/download?videoId=${encodeURIComponent(downloadVideoId)}&filename=${encodeURIComponent(downloadFilename)}`
    : actualVideoUrl
      ? `/api/video/download?url=${encodeURIComponent(actualVideoUrl)}&filename=${encodeURIComponent(downloadFilename)}`
      : undefined

  // 🔥 强制重置状态，确保视频可见
  useEffect(() => {
    setIsLoading(false)
    setHasError(false)
  }, [videoUrl])

  // Video load completed
  const handleVideoLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)

    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }

    // Record video view for database videos
    if (isFromDatabase && video?.id) {
      videoContext.recordVideoView(video.id)
    }
  }, [videoUrl, isFromDatabase, video?.id, videoContext])

  // Video load error
  const handleVideoError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    toast.error("Video failed to load, please refresh and try again")
  }, [videoUrl])

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return

    try {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        await videoRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      toast.error("Playback failed, please check your network connection")
    }
  }, [isPlaying])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return

    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  // Progress update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  // Video ended
  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!videoRef.current) return

    try {
      if (!document.fullscreenElement) {
        await videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Download video
  const handleDownload = useCallback(async () => {
    if (!downloadEndpoint) {
      toast.error("Download URL is not available", { id: "download" })
      return
    }

    try {
      toast.loading("Preparing download...", { id: "download" })

      const response = await fetch(downloadEndpoint, {
        credentials: "include",
      })
      if (!response.ok) {
        let errorMessage = `Download failed with HTTP ${response.status}`
        try {
          const data = await response.json()
          if (data?.error) {
            errorMessage = data.error
          }
        } catch {
          // Keep the HTTP status message when the response is not JSON.
        }
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      if (!blob.size) {
        throw new Error("Downloaded video is empty")
      }

      triggerBlobDownload(blob, downloadFilename)
      toast.success("Video download started", { id: "download" })
    } catch (error) {
      console.error("Video download failed:", error)

      if (actualVideoUrl) {
        triggerDirectDownload(actualVideoUrl, downloadFilename)
        toast.success("Download opened in a new tab", { id: "download" })
        return
      }

      toast.error("Download failed, please try again", { id: "download" })
    }
  }, [actualVideoUrl, downloadEndpoint, downloadFilename])

  // Share video
  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'VidFab AI Generated Video',
      text: `Check out this video I created with VidFab: "${prompt.slice(0, 100)}..."`,
      url: actualVideoUrl,
    }

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData)
        toast.success("Shared successfully")
      } else {
        // Fallback to copy link
        await navigator.clipboard.writeText(actualVideoUrl)
        toast.success("Video link copied to clipboard")
      }
    } catch (error) {
      // Fallback to copy link
      try {
        await navigator.clipboard.writeText(actualVideoUrl)
        toast.success("Video link copied to clipboard")
      } catch (clipboardError) {
        toast.error("Share failed, please copy video link manually")
      }
    }
  }, [actualVideoUrl, prompt])

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // 🔄 CLOUD NATIVE MIGRATION: 处理缩略图 URL
  // thumbnail_path 可能是:
  // 1. 完整视频 URL (临时方案) - 不使用 poster,让浏览器自动显示第一帧
  // 2. Supabase 图片相对路径 - 拼接完整 URL 用作 poster
  const isVideoUrl = video?.thumbnail_path?.startsWith('http') &&
    (video.thumbnail_path.includes('.mp4') || video.thumbnail_path.includes('video'))

  const actualThumbnailUrl = video?.thumbnail_path && !isVideoUrl
    ? (video.thumbnail_path.startsWith('http://') || video.thumbnail_path.startsWith('https://'))
      ? video.thumbnail_path // 完整图片 URL
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/video-thumbnails/${video.thumbnail_path}` // 相对路径
    : (thumbnailUrl && !thumbnailUrl.includes('.mp4') ? thumbnailUrl : undefined) // 如果是视频 URL,不使用 poster

  return (
    <Card className="bg-gray-950 border-gray-800">
      <CardContent className="p-0">
        {/* Video player */}
        <div className="relative group">
          <div
            className={cn(
              "relative bg-gray-900 flex items-center justify-center overflow-hidden",
              settings.aspectRatio === "16:9" ? "aspect-video" :
              settings.aspectRatio === "9:16" ? "aspect-[9/16]" :
              "aspect-square"
            )}
          >
            {/* 🔥 修复：始终显示视频元素，用loading overlay */}
            <video
              ref={videoRef}
              src={actualVideoUrl}
              poster={actualThumbnailUrl}
              className="w-full h-full object-contain bg-black"
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              muted={isMuted}
              playsInline
              preload="metadata"
            />

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="flex items-center justify-between flex-col">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
                  <p className="text-gray-400 text-sm">Loading video...</p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="flex items-center justify-between flex-col">
                  <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm mb-2">Video loading failed</p>
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </div>
            )}

            {/* Video control overlay */}
            {!isLoading && !hasError && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 right-4 space-y-3">
                  {/* Progress bar */}
                  <div className="bg-white/20 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={togglePlay}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video info and actions */}
        <div className="p-6 space-y-4">
          {/* Video details */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <p className="text-white font-medium line-clamp-2 flex-1">{prompt}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-gray-400">
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">{settings.model}</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                {typeof settings.duration === 'number' ? `${settings.duration}s` : settings.duration}
              </span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">{settings.resolution}</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">{settings.aspectRatio}</span>
              {settings.style && (
                <span className="px-2 py-1 bg-gray-800 rounded text-xs">{settings.style}</span>
              )}
            </div>
          </div>

          {/* Action buttons - Icon Only */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-lg border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

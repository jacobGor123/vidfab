"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Loader2, Download, ExternalLink, ChevronRight } from "lucide-react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { useRouter } from "next/navigation"
import type { VideoJob } from "@/lib/types/video"
import type { UserVideo } from "@/lib/supabase"

// ─── Demo placeholder (shown before first generation) ───────────────────────

const DEFAULT_DEMO_VIDEOS: Array<{ videoUrl: string; posterUrl?: string }> = [
  { videoUrl: "https://static.vidfab.ai/discover-new/discover-new-01.mp4" },
  { videoUrl: "https://static.vidfab.ai/discover-new/discover-new-02.mp4" },
  { videoUrl: "https://static.vidfab.ai/discover-new/discover-new-10.mp4" },
  { videoUrl: "https://static.vidfab.ai/discover-new/discover-new-03.mp4" },
]

function DemoPlaceholder({ videos }: { videos: Array<{ videoUrl: string; posterUrl?: string }> }) {
  const [index, setIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleCanPlay = () => {
    videoRef.current?.play().catch(() => {})
  }

  const handleEnded = () => {
    setIndex((prev) => (prev + 1) % videos.length)
  }

  // 切换视频时重新加载并播放
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.load()
    v.play().catch(() => {})
  }, [index])

  const current = videos[index]

  return (
    <div className="relative w-full rounded-xl overflow-hidden aspect-video bg-black">
      <video
        ref={videoRef}
        src={current.videoUrl}
        poster={current.posterUrl}
        muted
        playsInline
        preload="metadata"
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        className="w-full h-full object-cover"
      />
      {/* 轮播指示点 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {videos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              i === index ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ─── In-progress job ─────────────────────────────────────────────────────────

function JobInProgress({ job }: { job: VideoJob }) {
  const progress = job.progress ?? 0
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-6 py-10">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-brand-purple-DEFAULT/20" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-purple-DEFAULT animate-spin"
          style={{ animationDuration: "1.2s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-brand-purple-DEFAULT animate-spin" style={{ animationDuration: "2s" }} />
        </div>
      </div>
      <div className="text-center space-y-2 max-w-sm w-full px-4">
        <p className="text-gray-200 font-medium">Generating your video...</p>
        {progress > 0 && (
          <div className="w-full bg-brand-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-gray-500 text-xs line-clamp-2 italic">"{job.prompt}"</p>
        <p className="text-gray-600 text-xs">Estimated 2–5 minutes · Check My Assets when done</p>
      </div>
    </div>
  )
}

// ─── Completed result ─────────────────────────────────────────────────────────

function JobCompleted({ resultUrl, prompt, onGoToAssets }: { resultUrl: string; prompt: string; onGoToAssets: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [resultUrl])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vidfab-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // fallback: open in new tab
      window.open(resultUrl, "_blank")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={resultUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-brand-gray-700 text-sm text-gray-300 hover:border-brand-purple-DEFAULT/50 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isDownloading ? "Downloading..." : "Download"}
        </button>
        <button
          type="button"
          onClick={onGoToAssets}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-brand-gray-700 text-sm text-gray-300 hover:border-brand-purple-DEFAULT/50 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          My Assets
        </button>
      </div>
    </div>
  )
}

// ─── History thumbnail carousel ───────────────────────────────────────────────

function HistoryThumbnail({
  video,
  isActive,
  onSelect,
}: {
  video: UserVideo
  isActive: boolean
  onSelect: (video: UserVideo) => void
}) {
  const [hidden, setHidden] = useState(false)
  const src = video.original_url || (video as any).videoUrl as string

  if (hidden) return null

  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className={cn(
        "flex-shrink-0 w-[88px] h-[56px] rounded-md overflow-hidden bg-brand-gray-800 border transition-all duration-200 relative group",
        isActive
          ? "border-brand-purple-DEFAULT ring-1 ring-brand-purple-DEFAULT"
          : "border-brand-gray-700 hover:border-brand-purple-DEFAULT/50"
      )}
      title={video.prompt || "Video"}
    >
      <video
        src={src}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
        onError={() => setHidden(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </button>
  )
}

function HistoryCarousel({
  videos,
  activeId,
  onSelect,
  onGoToAssets,
}: {
  videos: UserVideo[]
  activeId: string | null
  onSelect: (video: UserVideo) => void
  onGoToAssets: () => void
}) {
  const validVideos = videos.filter(
    (v) => !!(v.original_url || (v as any).videoUrl)
  )
  if (validVideos.length === 0) return null

  return (
    <div className="space-y-2 w-full min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Generations</p>
        <button
          type="button"
          onClick={onGoToAssets}
          className="flex items-center gap-1 text-xs text-brand-purple-DEFAULT hover:text-brand-pink-DEFAULT transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-gray-700">
        {validVideos.slice(0, 20).map((video) => (
          <HistoryThumbnail
            key={video.id}
            video={video}
            isActive={video.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main result panel ───────────────────────────────────────────────────────

interface BuilderResultProps {
  currentJob: VideoJob | null
  completedVideos: UserVideo[]
  onLoadHistory: () => void
  demoVideos?: Array<{ videoUrl: string; posterUrl?: string }>
}

export function BuilderResult({ currentJob, completedVideos, onLoadHistory, demoVideos }: BuilderResultProps) {
  const [selectedVideo, setSelectedVideo] = useState<UserVideo | null>(null)
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const router = useRouter()

  const handleGoToAssets = () => {
    if (isAuthenticated) {
      router.push("/studio/my-assets")
    } else {
      setIsAuthOpen(true)
    }
  }

  useEffect(() => {
    onLoadHistory()
  }, [])

  const validHistory = completedVideos.filter(
    (v) => !!(v.original_url || (v as any).videoUrl)
  )
  const latestVideo = validHistory[0] ?? null

  const showJob = currentJob && currentJob.status !== "failed"
  const isCompleted = currentJob?.status === "completed" && currentJob.resultUrl
  const isFailed = currentJob?.status === "failed"

  // 任务完成时重置手动选中
  useEffect(() => {
    if (isCompleted) setSelectedVideo(null)
  }, [isCompleted])

  // 展示优先级：进行中任务 > 刚完成任务 > 手动选中历史 > 最新历史 > Demo
  const displayVideo = selectedVideo ?? (!showJob && !isFailed ? latestVideo : null)
  const showDemo = !showJob && !isFailed && !displayVideo

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Main result area */}
      <div className="flex-1 rounded-xl border border-brand-gray-700 bg-brand-gray-900/50 p-4 min-h-[280px] flex flex-col justify-center">
        {showDemo && <DemoPlaceholder videos={demoVideos ?? DEFAULT_DEMO_VIDEOS} />}

        {!showJob && !isFailed && displayVideo && (
          <JobCompleted resultUrl={displayVideo.original_url || (displayVideo as any).videoUrl} prompt={displayVideo.prompt} onGoToAssets={handleGoToAssets} />
        )}

        {showJob && !isCompleted && <JobInProgress job={currentJob} />}

        {isCompleted && (
          <JobCompleted resultUrl={currentJob.resultUrl!} prompt={currentJob.prompt} onGoToAssets={handleGoToAssets} />
        )}

        {isFailed && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <p className="text-red-400 font-medium">Generation failed</p>
            <p className="text-gray-500 text-sm">{currentJob.error || "An unexpected error occurred."}</p>
          </div>
        )}
      </div>

      {/* History carousel */}
      <HistoryCarousel
        videos={completedVideos}
        activeId={selectedVideo?.id ?? (displayVideo?.id ?? null)}
        onSelect={setSelectedVideo}
        onGoToAssets={handleGoToAssets}
      />

      {/* Auth modal */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="p-0 max-w-md">
          <DialogTitle className="sr-only">Sign in to VidFab</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

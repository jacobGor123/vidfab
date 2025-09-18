"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Play, Pause, Loader2, AlertCircle } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Hooks
import { useVideoLazyLoad } from "@/hooks/useVideoLazyLoad"
import { useHoverVideo, useSmartVideoPreload } from "@/hooks/useHoverVideo"
import { useVideoCache } from "@/hooks/useVideoCache"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

// Types
import type {
  VideoData,
  VideoLoadOptions,
  LazyLoadConfig,
  MediaQuality,
  OptimizedVideoCardProps
} from "@/types/video-optimization"

interface OptimizedVideoCardLocalProps {
  video: VideoData
  loadOptions?: Partial<VideoLoadOptions>
  lazyLoadConfig?: Partial<LazyLoadConfig>
  onCreateSimilar?: (videoId: string | number) => void
  className?: string
  style?: React.CSSProperties
}

export function OptimizedVideoCard({
  video,
  loadOptions = {},
  lazyLoadConfig = {},
  onCreateSimilar,
  className,
  style
}: OptimizedVideoCardLocalProps) {
  // Smart preload configuration
  const { shouldPreload, getOptimalQuality, getHoverDelay } = useSmartVideoPreload()

  // Final configuration
  const finalLoadOptions = useMemo(() => ({
    quality: getOptimalQuality(),
    preloadStrategy: shouldPreload ? 'metadata' : 'none',
    enableHoverPreview: true,
    hoverDelay: getHoverDelay(),
    maxConcurrentLoads: 2,
    cacheSize: 50,
    enableOfflineCache: true,
    ...loadOptions
  }), [loadOptions, shouldPreload, getOptimalQuality, getHoverDelay])

  // Lazy loading
  const {
    ref: lazyRef,
    isVisible,
    isLoading: lazyLoading,
    isLoaded: lazyLoaded,
    error: lazyError,
    loadVideo
  } = useVideoLazyLoad({
    id: String(video.id),
    thumbnailUrl: video.urls.thumbnail.webp,
    videoUrl: video.urls.video.medium,
    config: lazyLoadConfig
  })

  // Hover video functionality
  const {
    isHovered,
    isPlaying,
    canPlay,
    error: hoverError,
    handleMouseEnter,
    handleMouseLeave,
    videoRef
  } = useHoverVideo({
    id: String(video.id),
    previewUrl: video.urls.video.preview,
    fullVideoUrl: video.urls.video.medium,
    hoverDelay: finalLoadOptions.hoverDelay,
    enabled: finalLoadOptions.enableHoverPreview,
    preloadOnVisible: isVisible && shouldPreload
  })

  // Video caching
  const { getCachedVideo, cacheVideo } = useVideoCache()

  // States
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // Load cached or fresh video on visibility
  useEffect(() => {
    if (isVisible && !showVideo && shouldPreload) {
      const loadCachedVideo = async () => {
        try {
          const cachedUrl = await getCachedVideo(String(video.id), finalLoadOptions.quality)
          if (!cachedUrl) {
            // Cache the video for future use
            await cacheVideo(
              String(video.id),
              video.urls.video.medium,
              finalLoadOptions.quality
            )
          }
        } catch (error) {
          console.warn('视频缓存操作失败:', error)
        }
      }
      loadCachedVideo()
    }
  }, [isVisible, showVideo, shouldPreload, video.id, video.urls.video.medium, getCachedVideo, cacheVideo, finalLoadOptions.quality])

  // Show video when it can play and is hovered
  useEffect(() => {
    setShowVideo(canPlay && isHovered)
  }, [canPlay, isHovered])

  // Optimized image loading with WebP fallback
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    // Try JPEG fallback
    const img = document.createElement('img')
    img.onload = () => setImageLoaded(true)
    img.onerror = () => setImageError(true)
    img.src = video.urls.thumbnail.jpg
  }

  const handleCreateSimilar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCreateSimilar?.(video.id)
  }

  const thumbnailSrc = useMemo(() => {
    if (imageError) return video.urls.thumbnail.jpg
    return video.urls.thumbnail.webp
  }, [imageError, video.urls.thumbnail])

  const error = lazyError || hoverError

  return (
    <div
      ref={lazyRef}
      className={cn(
        "relative bg-gray-900 rounded-lg overflow-hidden mb-4 group cursor-pointer transition-transform duration-200 hover:scale-[1.02]",
        className
      )}
      style={{ height: video.metadata.resolution.height, ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-video-id={video.id}
    >
      {/* Main Content */}
      <div className="w-full h-full relative">

        {/* Background Placeholder */}
        {video.urls.placeholder && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110"
            style={{
              backgroundImage: `url(${video.urls.placeholder})`,
              opacity: imageLoaded ? 0 : 0.3
            }}
          />
        )}

        {/* Thumbnail Image */}
        {isVisible && (
          <>
            <img
              src={thumbnailSrc}
              alt={video.title}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0",
                showVideo ? "opacity-0" : "opacity-100"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />

            {/* Video Element */}
            {showVideo && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              >
                <source src={video.urls.video.medium} type="video/mp4" />
              </video>
            )}
          </>
        )}

        {/* Loading State */}
        {(lazyLoading || (!imageLoaded && !imageError)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-red-400">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">加载失败</p>
            </div>
          </div>
        )}

        {/* Play Indicator (when not playing video) */}
        {!showVideo && imageLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-black/50 rounded-full p-3">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Video Playing Indicator */}
        {isPlaying && (
          <div className="absolute top-3 right-3">
            <div className="bg-black/70 rounded-full p-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />

        {/* User Info - Bottom Left */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-2">
          <Avatar className="w-6 h-6 border border-white/20">
            <AvatarImage src={video.user.avatar} alt={video.user.name} />
            <AvatarFallback className="bg-gray-600 text-white text-xs">
              {video.user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-medium drop-shadow-lg">
            {video.user.name}
          </span>
        </div>

        {/* Create Similar Button - Bottom Right */}
        <div className="absolute bottom-3 right-3">
          <Button
            size="sm"
            onClick={handleCreateSimilar}
            className={cn(
              "bg-white/90 hover:bg-white text-black text-xs px-3 py-1.5 h-auto transition-all duration-300 backdrop-blur-sm",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            <Copy className="w-3 h-3 mr-1" />
            Remix
          </Button>
        </div>

        {/* Title Overlay - Top */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <h3 className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
            {video.title}
          </h3>
        </div>

        {/* Quality Badge */}
        {finalLoadOptions.quality !== 'auto' && (
          <div className="absolute top-3 left-3">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {finalLoadOptions.quality.toUpperCase()}
            </span>
          </div>
        )}

        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {Math.floor(video.duration)}s
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

// Components
import { OptimizedVideoCard } from "./OptimizedVideoCard"

// Hooks
import { useBatchLazyLoad } from "@/hooks/useVideoLazyLoad"
import { useBatchHoverVideo, useSmartVideoPreload } from "@/hooks/useHoverVideo"
import { useVideoCache, useVideoPreloader } from "@/hooks/useVideoCache"
import { useVisibleElements, useSmartPreload } from "@/hooks/useIntersectionObserver"

// Types
import type {
  VideoData,
  VideoLoadOptions,
  LazyLoadConfig,
  VideoGalleryProps,
  MediaQuality
} from "@/types/video-optimization"

// Default configuration
const DEFAULT_LOAD_OPTIONS: VideoLoadOptions = {
  quality: 'auto' as MediaQuality,
  preloadStrategy: 'metadata' as const,
  enableHoverPreview: true,
  hoverDelay: 200,
  maxConcurrentLoads: 3,
  cacheSize: 100,
  enableOfflineCache: true
}

const DEFAULT_LAZY_CONFIG: LazyLoadConfig = {
  root: null,
  rootMargin: '100px',
  threshold: 0.1,
  enableThumbnailPreload: true,
  enableVideoPreload: false,
  preloadDistance: 200
}

const DEFAULT_COLUMNS = {
  mobile: 1,
  tablet: 2,
  desktop: 4
}

interface OptimizedVideoGalleryLocalProps {
  videos: VideoData[]
  loadOptions?: Partial<VideoLoadOptions>
  lazyLoadConfig?: Partial<LazyLoadConfig>
  layout?: 'masonry' | 'grid' | 'list'
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
  onCreateSimilar?: (videoId: string | number) => void
  className?: string
}

export function OptimizedVideoGallery({
  videos,
  loadOptions = {},
  lazyLoadConfig = {},
  layout = 'masonry',
  columns = DEFAULT_COLUMNS,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onCreateSimilar,
  className
}: OptimizedVideoGalleryLocalProps) {
  // Smart preload configuration
  const {
    shouldPreload,
    getOptimalQuality,
    getHoverDelay,
    networkSpeed,
    deviceMemory
  } = useSmartVideoPreload()

  // Smart scroll preload
  const { scrollDirection, shouldPreload: smartShouldPreload, preloadMargin } = useSmartPreload({
    preloadDistance: 300,
    scrollSpeedThreshold: 200,
    maxPreloadItems: 8
  })

  // Final configurations
  const finalLoadOptions = useMemo(() => ({
    ...DEFAULT_LOAD_OPTIONS,
    quality: getOptimalQuality(),
    hoverDelay: getHoverDelay(),
    enableHoverPreview: shouldPreload,
    maxConcurrentLoads: networkSpeed === 'fast' ? 5 : networkSpeed === 'medium' ? 3 : 1,
    ...loadOptions
  }), [loadOptions, shouldPreload, getOptimalQuality, getHoverDelay, networkSpeed])

  const finalLazyConfig = useMemo(() => ({
    ...DEFAULT_LAZY_CONFIG,
    rootMargin: preloadMargin,
    enableThumbnailPreload: smartShouldPreload,
    enableVideoPreload: shouldPreload && smartShouldPreload,
    ...lazyLoadConfig
  }), [lazyLoadConfig, preloadMargin, smartShouldPreload, shouldPreload])

  // Batch operations
  const videoItems = useMemo(() =>
    videos.map(video => ({
      id: String(video.id),
      thumbnailUrl: video.urls.thumbnail.webp,
      videoUrl: video.urls.video.medium
    }))
  , [videos])

  const { loadedItems, errorItems, addToQueue } = useBatchLazyLoad({
    items: videoItems,
    maxConcurrent: finalLoadOptions.maxConcurrentLoads,
    config: finalLazyConfig
  })

  const {
    canPlayVideo,
    startPlaying,
    stopPlaying,
    currentlyPlayingCount
  } = useBatchHoverVideo({
    videos: videoItems,
    maxConcurrentPlay: deviceMemory >= 4 ? 2 : 1,
    hoverDelay: finalLoadOptions.hoverDelay,
    enabled: finalLoadOptions.enableHoverPreview
  })

  // Visible elements tracking
  const { visibleElements, observe, visibleCount } = useVisibleElements()

  // Preloader for background caching
  const { addToPreloadQueue, queueLength, isPreloading } = useVideoPreloader()

  // Load more functionality
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [shouldLoadMore, setShouldLoadMore] = useState(false)

  // Monitor visible elements for preloading
  useEffect(() => {
    visibleElements.forEach((element, videoId) => {
      const video = videos.find(v => String(v.id) === videoId)
      if (video && finalLazyConfig.enableVideoPreload) {
        addToPreloadQueue(
          videoId,
          video.urls.video.medium,
          finalLoadOptions.quality,
          1
        )
      }
    })
  }, [visibleElements, videos, finalLazyConfig.enableVideoPreload, addToPreloadQueue, finalLoadOptions.quality])

  // Load more intersection observer
  useEffect(() => {
    if (!loadMoreRef.current || !onLoadMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          setShouldLoadMore(true)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  // Execute load more
  useEffect(() => {
    if (shouldLoadMore) {
      setShouldLoadMore(false)
      onLoadMore?.()
    }
  }, [shouldLoadMore, onLoadMore])

  // Layout styles
  const layoutClasses = useMemo(() => {
    switch (layout) {
      case 'grid':
        return `grid gap-4 grid-cols-${columns.mobile} sm:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`
      case 'list':
        return 'flex flex-col gap-4'
      case 'masonry':
      default:
        return `columns-${columns.mobile} sm:columns-${columns.tablet} lg:columns-${columns.desktop} gap-4`
    }
  }, [layout, columns])

  // Performance statistics component
  const PerformanceStats = () => (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs space-y-1 opacity-50 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2">
        {networkSpeed === 'fast' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span>网络: {networkSpeed}</span>
      </div>
      <div>可见: {visibleCount}</div>
      <div>播放: {currentlyPlayingCount}</div>
      <div>队列: {queueLength}</div>
      <div>内存: {deviceMemory}GB</div>
    </div>
  )

  return (
    <div className={cn("w-full", className)}>
      {/* Gallery Container */}
      <div className={layoutClasses} style={{ columnFill: 'balance' }}>
        {videos.map((video) => (
          <OptimizedVideoCard
            key={video.id}
            video={video}
            loadOptions={finalLoadOptions}
            lazyLoadConfig={finalLazyConfig}
            onCreateSimilar={onCreateSimilar}
            className={layout === 'masonry' ? 'break-inside-avoid' : ''}
          />
        ))}
      </div>

      {/* Load More Section */}
      {(hasMore || isLoading) && (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center mt-8 py-8"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : hasMore ? (
            <Button
              variant="outline"
              onClick={onLoadMore}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8"
              disabled={isLoading}
            >
              加载更多
            </Button>
          ) : null}
        </div>
      )}

      {/* Preloading Indicator */}
      {isPreloading && (
        <div className="fixed bottom-4 left-4 bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>预加载中... ({queueLength})</span>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && !isLoading && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium mb-2">暂无视频</h3>
          <p className="text-sm">开始创建你的第一个视频吧！</p>
        </div>
      )}

      {/* Performance Stats (Development) */}
      {process.env.NODE_ENV === 'development' && <PerformanceStats />}
    </div>
  )
}

// Export additional utility components
export function VideoGalleryGrid(props: OptimizedVideoGalleryLocalProps) {
  return <OptimizedVideoGallery {...props} layout="grid" />
}

export function VideoGalleryList(props: OptimizedVideoGalleryLocalProps) {
  return <OptimizedVideoGallery {...props} layout="list" />
}

export function VideoGalleryMasonry(props: OptimizedVideoGalleryLocalProps) {
  return <OptimizedVideoGallery {...props} layout="masonry" />
}
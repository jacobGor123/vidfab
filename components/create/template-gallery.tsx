"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Play } from "lucide-react"
import { useRemix } from "@/hooks/use-remix"
import useSWR from 'swr'
import { transformDiscoverListToVideoData } from '@/lib/discover/transform'
import type { VideoData } from '@/types/video-optimization'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface VideoCardProps {
  video: VideoData
  onCreateSimilar: (videoId: string | number) => void
}

function VideoCard({ video, onCreateSimilar }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)

  // Fixed height calculation to prevent layout shifts
  const height = useMemo(() => {
    const baseHeight = video.aspectRatio === '9:16' ? 380 : 260
    const variation = parseInt(video.id.slice(-2), 36) % 100 // Use video ID for consistent variation
    return baseHeight + (variation % 80) // Add 0-80px variation
  }, [video.id, video.aspectRatio])


  const handleVideoCanPlay = useCallback(() => {
    setVideoLoaded(true)
    setVideoError(false)

    // 计算悬停到播放的延迟时间
    if (hoverStartTime) {
      const hoverDelay = Date.now() - hoverStartTime
    }
  }, [hoverStartTime, video.id])

  const handleVideoError = useCallback(() => {
    setVideoError(true)
    setVideoLoaded(false)
  }, [video.id])

  const handleVideoLoadStart = useCallback(() => {
    setVideoLoaded(false)
    setVideoError(false)
  }, [])

  const handleImageLoad = useCallback(() => {
    const img = document.querySelector(`[data-video-id="${video.id}"] img`) as HTMLImageElement
    const loadedUrl = img?.src || 'unknown'
    setImageLoaded(true)
    setImageError(false)
  }, [video.id])

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement
    const failedUrl = img.src


    // Check if this is a static.vidfab.ai URL (known issue)
    if (failedUrl.includes('static.vidfab.ai')) {}

    // Try poster fallback if available and different from current failed URL
    if (video.urls.poster && img.src !== video.urls.poster) {
      img.src = video.urls.poster
      return // Don't set error state yet, wait for fallback result
    }

    // Only set error state if no fallback or fallback also failed
    setImageError(true)
    setImageLoaded(false)
  }, [video.id, video.urls.thumbnail.webp, video.urls.poster])

  // 简化的视频className
  const videoClassName = useMemo(() => {
    return `absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
      isHovered && (videoLoaded && !videoError) ? 'opacity-100' : 'opacity-0'
    }`
  }, [videoLoaded, videoError, isHovered])

  // 添加防抖机制的鼠标悬停事件
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {

    // 清除之前的离开定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // 防止快速hover导致重复触发
    if (!isHovered) {
      setIsHovered(true)
      setHoverStartTime(Date.now())
    }
  }, [isHovered, video.id])

  const handleMouseLeave = useCallback(() => {

    // 添加短暂延迟，避免快速移入移出
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      setHoverStartTime(null)
      hoverTimeoutRef.current = null
    }, 100) // 100ms延迟
  }, [video.id])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Use original video URL instead of generated variants
  const videoSrc = video.urls.video.high // Use the original URL

  return (
    <div
      ref={cardRef}
      className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 group cursor-pointer"
      style={{ height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-video-id={video.id}
    >
      {/* Loading Skeleton - Only show when actually loading */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Error State - Only show when image failed to load */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center">
          <Play className="w-16 h-16 text-gray-500 mb-2" />
          <div className="text-gray-400 text-sm">Video Preview</div>
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={video.urls.thumbnail.webp}
        alt={video.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded && !(isHovered && videoLoaded && !videoError) ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Video Element - Only show when hovered */}
      {isHovered && (imageLoaded || imageError) && (
        <video
          src={videoSrc}
          className={videoClassName}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={handleVideoCanPlay}
          onError={handleVideoError}
          onLoadStart={handleVideoLoadStart}
        />
      )}


      {/* Video loading indicator */}
      {isHovered && !videoLoaded && !videoError && (imageLoaded || imageError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-black/60 rounded-full p-3">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Play icon when not playing video */}
      {!isHovered && (imageLoaded || imageError) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`} />

      {/* User Info - Hidden */}

      {/* Remix Button - Bottom Right */}
      <div className="absolute bottom-3 right-3">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onCreateSimilar(video.id)
          }}
          className={`bg-white/90 hover:bg-white text-black text-xs px-3 py-1.5 h-auto transition-all duration-300 backdrop-blur-sm ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <Copy className="w-3 h-3 mr-1" />
          Remix
        </Button>
      </div>

      {/* Duration badge */}
      {video.duration && (imageLoaded || imageError) && (
        <div className="absolute top-3 right-3">
          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {Math.floor(video.duration)}s
          </span>
        </div>
      )}
    </div>
  )
}


export function TemplateGallery() {
  const [activeCategory, setActiveCategory] = useState("All")

  const { remixVideo } = useRemix()

  // 从 API 获取 Discover 数据（默认获取所有 active 数据，最多 1000 条）
  const { data: apiData, error: apiError, isLoading } = useSWR('/api/discover', fetcher)

  // 处理 API 数据
  const currentData = useMemo(() => {
    if (!apiData?.success || !apiData?.data) return []
    return transformDiscoverListToVideoData(apiData.data)
  }, [apiData])

  // 从 API 获取分类统计
  const { data: categoriesData } = useSWR('/api/discover/categories', fetcher)
  const currentCategories = useMemo(() => {
    return categoriesData?.data || []
  }, [categoriesData])

  // Filter videos by category
  const filteredVideos = useMemo(() => {
    if (activeCategory === "All") return currentData

    const categoryKey = activeCategory.toLowerCase()
    return currentData.filter(video =>
      video.category === categoryKey
    )
  }, [activeCategory, currentData])

  const handleCreateSimilar = async (videoId: string | number) => {
    const video = currentData.find(v => v.id === videoId)
    if (!video) return

    await remixVideo({
      prompt: video.prompt || video.description,
      imageUrl: video.urls.poster || video.urls.thumbnail.webp,
      title: video.title
    })
  }

  return (
    <>
      <div className="h-screen overflow-y-auto p-6 custom-scrollbar relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <div className="text-white text-lg font-medium">Loading Discover...</div>
            <div className="text-gray-400 text-sm">Fetching creative inspirations</div>
          </div>
        </div>
      )}

      {/* Categories - 已隐藏 */}
      {false && (
        <div className="flex flex-wrap gap-2 mb-6">
          {currentCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-800 text-gray-300 hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      )}

      {/* Masonry Layout using CSS columns */}
      {!isLoading && filteredVideos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <div className="text-gray-500 text-6xl">🎬</div>
          <div className="text-gray-400 text-lg font-medium">No videos found</div>
          <div className="text-gray-500 text-sm">Check back later for new creative content</div>
        </div>
      )}

      {!isLoading && filteredVideos.length > 0 && (
        <div
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
          style={{ columnFill: 'balance' }}
        >
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onCreateSimilar={handleCreateSimilar}
            />
          ))}
        </div>
      )}

      {/* Load More - Show total count and performance metrics */}
      {!isLoading && filteredVideos.length > 0 && (
        <div className="text-center mt-8">
          <div className="text-gray-400 text-sm mb-4">
            <div>Showing {filteredVideos.length} / {currentData.length} videos</div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
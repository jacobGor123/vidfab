"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Play, Zap } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useRemix } from "@/hooks/use-remix"
import { useVideoPreloader } from "@/hooks/use-video-preloader"
import { VideoItem } from "@/types/video-preloader"
import { VideoPreloaderDebugPanel } from "@/components/video-preloader-debug-panel"
import { videoTemplatesData, discoverCategories } from "@/data/video-templates"
import { demoVideoTemplatesData, demoCategoriesData } from "@/data/demo-video-templates"

interface VideoCardProps {
  video: typeof videoTemplatesData[0]
  onCreateSimilar: (videoId: string | number) => void
  getPreloadedVideo?: (videoId: string | number) => HTMLVideoElement | null
  isVisible?: boolean
  onVisibilityChange?: (isVisible: boolean) => void
}

function VideoCard({ video, onCreateSimilar, getPreloadedVideo, isVisible, onVisibilityChange }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  // Fixed height calculation to prevent layout shifts
  const height = useMemo(() => {
    const baseHeight = video.aspectRatio === '9:16' ? 380 : 260
    const variation = parseInt(video.id.slice(-2), 36) % 100 // Use video ID for consistent variation
    return baseHeight + (variation % 80) // Add 0-80px variation
  }, [video.id, video.aspectRatio])

  // 设置可见性观察器
  useEffect(() => {
    if (!cardRef.current || !onVisibilityChange) return

    intersectionObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    intersectionObserverRef.current.observe(cardRef.current)

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
      }
    }
  }, [onVisibilityChange])

  // 检查预加载状态
  useEffect(() => {
    if (getPreloadedVideo) {
      const preloadedElement = getPreloadedVideo(video.id)
      setIsPreloaded(!!preloadedElement)
    }
  }, [video.id, getPreloadedVideo])

  const handleVideoCanPlay = useCallback(() => {
    setVideoLoaded(true)
    setVideoError(false)

    // 计算悬停到播放的延迟时间
    if (hoverStartTime) {
      const hoverDelay = Date.now() - hoverStartTime
      console.log(`视频播放延迟: ${hoverDelay}ms (预加载: ${isPreloaded ? '是' : '否'})`, {
        videoId: video.id,
        delay: hoverDelay,
        preloaded: isPreloaded
      })
    }
  }, [hoverStartTime, isPreloaded, video.id])

  const handleVideoError = useCallback(() => {
    setVideoError(true)
    setVideoLoaded(false)
    console.warn('视频播放失败:', video.id)
  }, [video.id])

  const handleVideoLoadStart = useCallback(() => {
    setVideoLoaded(false)
    setVideoError(false)
  }, [])

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // 稳定的视频className，避免useEffect重复执行
  const videoClassName = useMemo(() =>
    `absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
      videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
    }`, [videoLoaded, videoError])

  // 处理鼠标悬停事件
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    setHoverStartTime(Date.now())
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setHoverStartTime(null)
  }, [])

  // Use original video URL instead of generated variants
  const videoSrc = video.urls.video.high // Use the original URL

  // 获取预加载的视频元素（直接复用，不克隆）
  const getPreloadedVideoElement = useCallback(() => {
    if (getPreloadedVideo) {
      const preloadedElement = getPreloadedVideo(video.id)
      if (preloadedElement && preloadedElement.readyState >= 2) {
        console.log(`✅ 复用预加载视频: ${video.id}, readyState: ${preloadedElement.readyState}`)
        return preloadedElement
      }
    }
    return null
  }, [video.id, getPreloadedVideo])

  return (
    <div
      ref={cardRef}
      className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 group cursor-pointer"
      style={{ height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-video-id={video.id}
    >
      {/* Loading Skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={video.urls.thumbnail.jpg}
        alt={video.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          !imageLoaded ? 'opacity-0' :
          (isHovered && videoLoaded && !videoError) ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Video Element - Only show when hovered */}
      {isHovered && imageLoaded && (
        <SmartVideoElement
          videoSrc={videoSrc}
          videoId={video.id}
          preloadedElement={getPreloadedVideoElement()}
          onCanPlay={handleVideoCanPlay}
          onError={handleVideoError}
          onLoadStart={handleVideoLoadStart}
          className={videoClassName}
        />
      )}

      {/* Video loading indicator */}
      {isHovered && !videoLoaded && !videoError && imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-black/60 rounded-full p-3">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Play icon when not playing video */}
      {!isHovered && imageLoaded && (
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

      {/* Duration badge with preload indicator */}
      {video.duration && imageLoaded && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isPreloaded && (
            <div className="bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
              <Zap className="w-3 h-3" />
              预加载
            </div>
          )}
          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {Math.floor(video.duration)}s
          </span>
        </div>
      )}
    </div>
  )
}

// 智能视频元素组件
interface SmartVideoElementProps {
  videoSrc: string
  videoId: string | number
  preloadedElement: HTMLVideoElement | null
  onCanPlay: () => void
  onError: () => void
  onLoadStart: () => void
  className: string
}

function SmartVideoElement({
  videoSrc,
  videoId,
  preloadedElement,
  onCanPlay,
  onError,
  onLoadStart,
  className
}: SmartVideoElementProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const callbacksRef = useRef({ onCanPlay, onError, onLoadStart })

  // 更新回调引用，避免作为useEffect依赖项
  callbacksRef.current = { onCanPlay, onError, onLoadStart }

  useEffect(() => {
    if (!containerRef.current) return

    // 清理之前的视频元素
    if (videoElementRef.current && videoElementRef.current.parentNode) {
      videoElementRef.current.pause()
      videoElementRef.current.parentNode.removeChild(videoElementRef.current)
      videoElementRef.current = null
    }

    let currentVideoElement: HTMLVideoElement

    // 如果有预加载的视频元素且可以播放，直接复用
    if (preloadedElement && preloadedElement.readyState >= 2) {
      console.log(`🎯 直接复用预加载视频: ${videoId}, readyState: ${preloadedElement.readyState}`)

      currentVideoElement = preloadedElement
      currentVideoElement.muted = true
      currentVideoElement.loop = true
      currentVideoElement.currentTime = 0

      // 立即触发canplay事件，因为视频已经准备好了
      setTimeout(() => {
        callbacksRef.current.onCanPlay()
        currentVideoElement.play().catch(error => {
          console.warn('预加载视频自动播放失败:', error)
        })
      }, 10)

    } else {
      // 如果没有预加载元素，创建新的video元素
      console.log(`📥 创建新视频元素: ${videoId}`)

      currentVideoElement = document.createElement('video')
      currentVideoElement.muted = true
      currentVideoElement.loop = true
      currentVideoElement.autoplay = true
      currentVideoElement.playsInline = true
      currentVideoElement.preload = 'auto'
      currentVideoElement.src = videoSrc

      // 使用ref中的回调，避免闭包问题
      currentVideoElement.addEventListener('canplay', () => callbacksRef.current.onCanPlay())
      currentVideoElement.addEventListener('error', () => callbacksRef.current.onError())
      currentVideoElement.addEventListener('loadstart', () => callbacksRef.current.onLoadStart())
    }

    // 统一设置样式（在useEffect外部处理）
    currentVideoElement.className = className

    // 将视频元素添加到容器中
    containerRef.current.appendChild(currentVideoElement)
    videoElementRef.current = currentVideoElement

  }, [videoId, preloadedElement, videoSrc]) // 移除className和回调函数依赖

  // 单独处理className更新，避免重新创建视频元素
  useEffect(() => {
    if (videoElementRef.current) {
      videoElementRef.current.className = className
    }
  }, [className])

  // 清理effect
  useEffect(() => {
    return () => {
      if (videoElementRef.current && videoElementRef.current.parentNode) {
        videoElementRef.current.pause()
        videoElementRef.current.parentNode.removeChild(videoElementRef.current)
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}

export function TemplateGallery() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [useDemoData, setUseDemoData] = useState(false)
  const [visibleVideos, setVisibleVideos] = useState<Set<string | number>>(new Set())
  const [showDebugPanel, setShowDebugPanel] = useState(false)

  const { remixVideo } = useRemix()

  // 初始化智能视频预加载器
  const {
    preloadVideo,
    getPreloadedVideo,
    updateVisibleVideos,
    metrics,
    realtimeMetrics,
    isInitialized,
    preloadVisibleVideos,
    preloader,
    config,
    cancelPreload,
    updateConfig,
    optimizeMemoryUsage,
    getDebugInfo,
    exportMetrics,
    adaptToNetworkConditions,
    // 新的批量预加载方法
    batchPreloadInitial,
    batchPreloadRemaining
  } = useVideoPreloader({
    maxConcurrentLoads: 3,
    visibilityThreshold: 0.1,
    priorityDistance: 800,
    memoryLimit: 100,
    networkAware: true,
    performanceAware: true
  })

  // 选择数据源：如果启用演示模式或原始数据无法访问，使用演示数据
  const currentData = useDemoData ? demoVideoTemplatesData : videoTemplatesData
  const currentCategories = useDemoData ? demoCategoriesData : discoverCategories

  // Filter videos by category
  const filteredVideos = useMemo(() => {
    if (activeCategory === "All") return currentData

    const categoryKey = activeCategory.toLowerCase()
    return currentData.filter(video =>
      video.category === categoryKey
    )
  }, [activeCategory, currentData])

  // 转换视频数据为预加载器格式
  const videoItems = useMemo((): VideoItem[] => {
    return filteredVideos.map(video => ({
      id: video.id,
      videoUrl: video.urls.video.high,
      thumbnailUrl: video.urls.thumbnail.jpg,
      duration: video.duration,
      fileSize: undefined, // 可以从API获取或估算
      priority: 0
    }))
  }, [filteredVideos])

  // 处理视频可见性变化
  const handleVideoVisibilityChange = useCallback((videoId: string | number, isVisible: boolean) => {
    setVisibleVideos(prev => {
      const newSet = new Set(prev)
      if (isVisible) {
        newSet.add(videoId)
      } else {
        newSet.delete(videoId)
      }
      return newSet
    })
  }, [])

  // 🚀 激进预加载策略：页面加载完成后立即预加载
  useEffect(() => {
    if (!isInitialized || videoItems.length === 0) return

    console.log('🎯 激进预加载触发条件满足，开始预加载')

    // 延迟一小段时间，确保页面渲染完成，避免阻塞UI
    const initialDelay = setTimeout(() => {
      // 步骤1：立即开始激进预加载前N个视频
      batchPreloadInitial(videoItems).then(() => {
        console.log('✅ 激进预加载阶段完成')

        // 步骤2：继续渐进式预加载剩余视频
        return batchPreloadRemaining(videoItems)
      }).then(() => {
        console.log('✅ 渐进式预加载阶段完成')
      }).catch(error => {
        console.warn('❌ 批量预加载过程中出现错误:', error)
      })
    }, 500) // 500ms延迟，让页面先渲染

    return () => clearTimeout(initialDelay)
  }, [isInitialized, videoItems, batchPreloadInitial, batchPreloadRemaining])

  // 当可见视频发生变化时，更新预加载器（保持现有逻辑作为补充）
  useEffect(() => {
    if (!isInitialized) return

    const visibleVideoItems = videoItems.filter(video => visibleVideos.has(video.id))

    if (visibleVideoItems.length > 0) {
      updateVisibleVideos(visibleVideoItems)

      // 延迟执行预加载，避免阻塞UI
      const timeoutId = setTimeout(() => {
        preloadVisibleVideos(visibleVideoItems).catch(error => {
          console.warn('批量预加载失败:', error)
        })
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [visibleVideos, videoItems, isInitialized, updateVisibleVideos, preloadVisibleVideos])

  const handleCreateSimilar = async (videoId: string | number) => {
    const video = currentData.find(v => v.id === videoId)
    if (!video) return

    await remixVideo({
      prompt: video.prompt || video.description,
      imageUrl: video.urls.poster || video.urls.thumbnail.jpg,
      title: video.title
    })
  }

  return (
    <>
      <div className="h-screen overflow-y-auto p-6 custom-scrollbar">

      {/* Categories */}
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

      {/* Masonry Layout using CSS columns */}
      <div
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
        style={{ columnFill: 'balance' }}
      >
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onCreateSimilar={handleCreateSimilar}
            getPreloadedVideo={getPreloadedVideo}
            isVisible={visibleVideos.has(video.id)}
            onVisibilityChange={(isVisible) => handleVideoVisibilityChange(video.id, isVisible)}
          />
        ))}
      </div>

      {/* Load More - Show total count and performance metrics */}
      <div className="text-center mt-8">
        <div className="text-gray-400 text-sm mb-4 space-y-1">
          <div>显示 {filteredVideos.length} / {currentData.length} 个视频</div>
          {isInitialized && (
            <div className="flex justify-center gap-4 text-xs">
              <span>预加载: {realtimeMetrics.queueLength} 个</span>
              <span>内存: {Math.round(realtimeMetrics.currentMemoryUsage)}MB</span>
              <span>命中率: {Math.round(metrics.hitRate * 100)}%</span>
              {metrics.averageHoverDelay > 0 && (
                <span>延迟: {Math.round(metrics.averageHoverDelay)}ms</span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8"
        >
          Load More
        </Button>

        {/* 开发环境调试按钮 */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
          >
            {showDebugPanel ? '隐藏' : '显示'}调试面板
          </Button>
        )}
      </div>
      </div>

      {/* 调试面板 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <VideoPreloaderDebugPanel
          preloaderHook={{
            preloader,
            config,
            metrics,
            realtimeMetrics,
            isInitialized,
            preloadVideo,
            getPreloadedVideo,
            updateVisibleVideos,
            cancelPreload,
            updateConfig,
            preloadVisibleVideos,
            optimizeMemoryUsage,
            getDebugInfo,
            exportMetrics,
            adaptToNetworkConditions
          }}
          isVisible={showDebugPanel}
        />
      )}
    </>
  )
}
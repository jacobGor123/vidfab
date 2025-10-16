"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LazyVideoProps {
  src: string
  alt?: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  preload?: "none" | "metadata" | "auto"
  poster?: string
  onLoadStart?: () => void
  onLoadedData?: () => void
  onError?: (error: Error) => void
}

/**
 * LazyVideo 组件 - 支持懒加载和自动播放的视频组件
 *
 * 特性:
 * 1. Intersection Observer 实现视频懒加载
 * 2. 进入视口时自动加载和播放
 * 3. 离开视口时暂停播放（节省资源）
 * 4. 加载中显示骨架屏
 * 5. 加载失败显示错误状态
 */
export function LazyVideo({
  src,
  alt = "Video content",
  className,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  preload = "metadata",
  poster,
  onLoadStart,
  onLoadedData,
  onError,
}: LazyVideoProps) {
  const [isInView, setIsInView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(autoPlay)
  const [preloadValue, setPreloadValue] = useState(preload)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 检测网络和设备状况，决定是否自动播放
  useEffect(() => {
    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const saveData = connection?.saveData || false
    const isSlowConnection = connection?.effectiveType === 'slow-2g' ||
                            connection?.effectiveType === '2g' ||
                            connection?.effectiveType === '3g'

    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    // 省流量模式、慢速连接或移动端时禁用自动播放
    if (saveData || isSlowConnection || isMobile) {
      setShouldAutoPlay(false)
      setPreloadValue('none') // 省流量模式下不预加载
    } else {
      setShouldAutoPlay(autoPlay)
      setPreloadValue(isSlowConnection ? 'none' : preload)
    }
  }, [autoPlay, preload])

  // Intersection Observer - 监听元素是否进入视口
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 进入视口 - 开始加载视频
          if (entry.isIntersecting) {
            setIsInView(true)
          } else {
            // 离开视口 - 暂停播放节省资源
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause()
              setIsPlaying(false)
            }
          }
        })
      },
      {
        rootMargin: "0px", // 不提前加载，进入视口才加载
        threshold: 0.25, // 25% 可见时触发（提高到 25% 避免过早加载）
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  // 处理视频加载和自动播放
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isInView) return

    const handleLoadStart = () => {
      setIsLoading(true)
      onLoadStart?.()
    }

    const handleLoadedData = () => {
      setIsLoading(false)
      setHasError(false)
      onLoadedData?.()

      // 自动播放 - 使用智能检测后的 shouldAutoPlay
      if (shouldAutoPlay && isInView) {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true)
            })
            .catch((error) => {
              console.warn("Video autoplay failed:", error)
              setIsPlaying(false)
            })
        }
      }
    }

    const handleError = () => {
      setIsLoading(false)
      setHasError(true)
      const error = new Error(`Failed to load video: ${src}`)
      onError?.(error)
      console.error(error)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("error", handleError)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("error", handleError)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [isInView, shouldAutoPlay, src, onLoadStart, onLoadedData, onError])

  // 视口可见性变化时恢复播放
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isInView || !shouldAutoPlay || isLoading || hasError) return

    if (video.paused && !isPlaying) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Resume play failed:", error)
        })
      }
    }
  }, [isInView, shouldAutoPlay, isLoading, hasError, isPlaying])

  return (
    <div ref={containerRef} className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* 骨架屏占位 */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full bg-gradient-to-br from-brand-gray-800/80 to-brand-gray-900/80">
            <div className="flex items-center justify-center h-full">
              <div className="space-y-4 text-center">
                {/* Loading Spinner */}
                <div className="w-12 h-12 mx-auto">
                  <div className="w-full h-full border-4 border-brand-purple-DEFAULT/30 border-t-brand-purple-DEFAULT rounded-full animate-spin" />
                </div>
                <p className="text-sm text-gray-400">Loading video...</p>
              </div>
            </div>
          </Skeleton>
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 z-10 bg-brand-gray-900/90 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-medium">Failed to load video</p>
            <p className="text-gray-500 text-xs mt-1">{src}</p>
          </div>
        </div>
      )}

      {/* 视频元素 */}
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        autoPlay={false} // 手动控制播放
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preloadValue}
        poster={poster}
        aria-label={alt}
      >
        {isInView && <source src={src} type="video/mp4" />}
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

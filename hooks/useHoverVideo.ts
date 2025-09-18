"use client"

import { useRef, useState, useEffect, useCallback } from 'react'
import { MediaQuality } from '@/types/video-optimization'
import type {
  UseHoverVideoReturn,
  VideoPlayEvent
} from '@/types/video-optimization'

interface UseHoverVideoOptions {
  id: string
  previewUrl?: string
  fullVideoUrl: string
  hoverDelay?: number
  enabled?: boolean
  preloadOnVisible?: boolean
  onPlay?: (event: VideoPlayEvent) => void
  onError?: (error: Error) => void
}

export function useHoverVideo({
  id,
  previewUrl,
  fullVideoUrl,
  hoverDelay = 200,
  enabled = true,
  preloadOnVisible = false,
  onPlay,
  onError
}: UseHoverVideoOptions): UseHoverVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()
  const playStartTime = useRef<number>(0)

  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [canPlay, setCanPlay] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isPreloaded, setIsPreloaded] = useState(false)

  // 预加载视频
  const preloadVideo = useCallback(async () => {
    if (isPreloaded || !enabled) return

    const video = videoRef.current
    if (!video) return

    try {
      const videoUrl = previewUrl || fullVideoUrl
      video.src = videoUrl
      video.preload = 'metadata'
      video.muted = true
      video.loop = true

      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          setCanPlay(true)
          setIsPreloaded(true)
          resolve()
        }

        const handleError = () => {
          reject(new Error('视频预加载失败'))
        }

        video.addEventListener('canplaythrough', handleCanPlay, { once: true })
        video.addEventListener('error', handleError, { once: true })

        // 超时处理
        setTimeout(() => {
          video.removeEventListener('canplaythrough', handleCanPlay)
          video.removeEventListener('error', handleError)
          reject(new Error('视频预加载超时'))
        }, 5000)
      })
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('视频预加载失败')
      setError(errorObj)
      onError?.(errorObj)
    }
  }, [previewUrl, fullVideoUrl, enabled, isPreloaded, onError])

  // 播放视频
  const playVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video || !canPlay || isPlaying) return

    try {
      playStartTime.current = performance.now()
      await video.play()
      setIsPlaying(true)

      const delay = performance.now() - playStartTime.current
      onPlay?.({
        id,
        trigger: 'hover',
        delay
      })
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('视频播放失败')
      setError(errorObj)
      onError?.(errorObj)
    }
  }, [id, canPlay, isPlaying, onPlay, onError])

  // 暂停视频
  const pauseVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || !isPlaying) return

    video.pause()
    video.currentTime = 0 // 重置到开始位置
    setIsPlaying(false)
  }, [isPlaying])

  // 鼠标进入处理
  const handleMouseEnter = useCallback(() => {
    if (!enabled) return

    setIsHovered(true)
    setError(null)

    // 清除之前的定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // 设置延迟播放
    hoverTimeoutRef.current = setTimeout(() => {
      if (canPlay) {
        playVideo()
      } else {
        // 如果还没预加载，先预加载再播放
        preloadVideo().then(() => {
          if (isHovered) { // 确保鼠标还在悬停状态
            playVideo()
          }
        })
      }
    }, hoverDelay)
  }, [enabled, canPlay, hoverDelay, playVideo, preloadVideo, isHovered])

  // 鼠标离开处理
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)

    // 清除延迟播放定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // 暂停视频
    pauseVideo()
  }, [pauseVideo])

  // 预加载处理
  useEffect(() => {
    if (preloadOnVisible && enabled) {
      preloadVideo()
    }
  }, [preloadOnVisible, enabled, preloadVideo])

  // 清理函数
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return {
    isHovered,
    isPlaying,
    canPlay,
    error,
    handleMouseEnter,
    handleMouseLeave,
    videoRef
  }
}

// 批量悬停视频管理Hook
interface UseBatchHoverVideoOptions {
  videos: Array<{
    id: string
    previewUrl?: string
    fullVideoUrl: string
  }>
  maxConcurrentPlay?: number
  hoverDelay?: number
  enabled?: boolean
}

export function useBatchHoverVideo({
  videos,
  maxConcurrentPlay = 1,
  hoverDelay = 200,
  enabled = true
}: UseBatchHoverVideoOptions) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Set<string>>(new Set())
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set())

  const canPlayVideo = useCallback((videoId: string) => {
    return currentlyPlaying.size < maxConcurrentPlay
  }, [currentlyPlaying.size, maxConcurrentPlay])

  const startPlaying = useCallback((videoId: string) => {
    if (!canPlayVideo(videoId)) {
      // 如果超过最大并发数，停止其他视频
      const playingArray = Array.from(currentlyPlaying)
      const oldestPlaying = playingArray[0]
      if (oldestPlaying) {
        setCurrentlyPlaying(prev => {
          const newSet = new Set(prev)
          newSet.delete(oldestPlaying)
          return newSet
        })
      }
    }

    setCurrentlyPlaying(prev => new Set([...prev, videoId]))
  }, [canPlayVideo, currentlyPlaying])

  const stopPlaying = useCallback((videoId: string) => {
    setCurrentlyPlaying(prev => {
      const newSet = new Set(prev)
      newSet.delete(videoId)
      return newSet
    })
  }, [])

  const markAsPreloaded = useCallback((videoId: string) => {
    setPreloadedVideos(prev => new Set([...prev, videoId]))
  }, [])

  const isVideoPlaying = useCallback((videoId: string) => {
    return currentlyPlaying.has(videoId)
  }, [currentlyPlaying])

  const isVideoPreloaded = useCallback((videoId: string) => {
    return preloadedVideos.has(videoId)
  }, [preloadedVideos])

  return {
    canPlayVideo,
    startPlaying,
    stopPlaying,
    markAsPreloaded,
    isVideoPlaying,
    isVideoPreloaded,
    currentlyPlayingCount: currentlyPlaying.size
  }
}

// 智能预加载策略Hook
export function useSmartVideoPreload() {
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'medium' | 'fast'>('medium')
  const [deviceMemory, setDeviceMemory] = useState<number>(4) // GB
  const [shouldPreload, setShouldPreload] = useState(true)

  // 检测网络速度
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const updateNetworkInfo = () => {
        const effectiveType = connection.effectiveType
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setNetworkSpeed('slow')
        } else if (effectiveType === '3g') {
          setNetworkSpeed('medium')
        } else {
          setNetworkSpeed('fast')
        }
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)

      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  // 检测设备内存
  useEffect(() => {
    if ('deviceMemory' in navigator) {
      setDeviceMemory((navigator as any).deviceMemory || 4)
    }
  }, [])

  // 根据设备能力决定预加载策略
  useEffect(() => {
    const shouldPreloadBased = networkSpeed === 'fast' && deviceMemory >= 4
    setShouldPreload(shouldPreloadBased)
  }, [networkSpeed, deviceMemory])

  const getOptimalQuality = useCallback((): MediaQuality => {
    if (networkSpeed === 'slow' || deviceMemory < 2) {
      return MediaQuality.LOW
    } else if (networkSpeed === 'medium' || deviceMemory < 4) {
      return MediaQuality.MEDIUM
    }
    return MediaQuality.HIGH
  }, [networkSpeed, deviceMemory])

  const getHoverDelay = useCallback((): number => {
    if (networkSpeed === 'slow') return 500
    if (networkSpeed === 'medium') return 300
    return 200
  }, [networkSpeed])

  return {
    networkSpeed,
    deviceMemory,
    shouldPreload,
    getOptimalQuality,
    getHoverDelay
  }
}
"use client"

import { useRef, useState, useEffect, useCallback } from 'react'
import type {
  UseVideoLazyLoadReturn,
  VideoLoadState,
  MediaQuality,
  LazyLoadConfig,
  VideoLoadEvent,
  VideoErrorEvent
} from '@/types/video-optimization'

// 默认懒加载配置
const DEFAULT_LAZY_CONFIG: LazyLoadConfig = {
  root: null,
  rootMargin: '100px',
  threshold: 0.1,
  enableThumbnailPreload: true,
  enableVideoPreload: false,
  preloadDistance: 200
}

interface UseVideoLazyLoadOptions {
  id: string
  thumbnailUrl: string
  videoUrl: string
  config?: Partial<LazyLoadConfig>
  onLoad?: (event: VideoLoadEvent) => void
  onError?: (event: VideoErrorEvent) => void
}

export function useVideoLazyLoad({
  id,
  thumbnailUrl,
  videoUrl,
  config = {},
  onLoad,
  onError
}: UseVideoLazyLoadOptions): UseVideoLazyLoadReturn {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const finalConfig = { ...DEFAULT_LAZY_CONFIG, ...config }
  const loadStartTime = useRef<number>(0)

  // 创建 Intersection Observer
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsVisible(entry.isIntersecting)

        // 当元素进入视口时自动加载缩略图
        if (entry.isIntersecting && finalConfig.enableThumbnailPreload && !isLoaded) {
          loadThumbnail()
        }
      },
      {
        root: finalConfig.root,
        rootMargin: finalConfig.rootMargin,
        threshold: finalConfig.threshold
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [finalConfig.root, finalConfig.rootMargin, finalConfig.threshold, isLoaded])

  // 加载缩略图
  const loadThumbnail = useCallback(async () => {
    if (isLoading || isLoaded) return

    setIsLoading(true)
    setError(null)
    loadStartTime.current = performance.now()

    try {
      const img = new Image()

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('缩略图加载失败'))
        img.src = thumbnailUrl
      })

      const loadTime = performance.now() - loadStartTime.current
      setIsLoaded(true)

      onLoad?.({
        id,
        quality: MediaQuality.LOW,
        loadTime,
        fromCache: false
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('缩略图加载失败')
      setError(error)

      onError?.({
        id,
        error,
        quality: MediaQuality.LOW,
        retryCount
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, thumbnailUrl, isLoading, isLoaded, retryCount, onLoad, onError])

  // 加载视频
  const loadVideo = useCallback(async (quality: MediaQuality = MediaQuality.MEDIUM) => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    loadStartTime.current = performance.now()

    try {
      // 创建视频元素进行预加载
      const video = document.createElement('video')

      await new Promise<void>((resolve, reject) => {
        video.oncanplaythrough = () => resolve()
        video.onerror = () => reject(new Error('视频加载失败'))
        video.preload = 'metadata'
        video.src = videoUrl
      })

      const loadTime = performance.now() - loadStartTime.current
      setIsLoaded(true)

      onLoad?.({
        id,
        quality,
        loadTime,
        fromCache: false
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('视频加载失败')
      setError(error)

      onError?.({
        id,
        error,
        quality,
        retryCount
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, videoUrl, isLoading, retryCount, onLoad, onError])

  // 重试加载
  const retryLoad = useCallback(() => {
    setRetryCount(prev => prev + 1)
    setError(null)
    setIsLoaded(false)

    // 重试时先尝试加载缩略图
    if (isVisible) {
      loadThumbnail()
    }
  }, [isVisible, loadThumbnail])

  return {
    ref,
    isVisible,
    isLoading,
    isLoaded,
    error,
    loadVideo,
    retryLoad
  }
}

// 批量懒加载Hook - 用于优化大量视频的加载
interface UseBatchLazyLoadOptions {
  items: Array<{ id: string; thumbnailUrl: string; videoUrl: string }>
  maxConcurrent?: number
  config?: Partial<LazyLoadConfig>
}

export function useBatchLazyLoad({
  items,
  maxConcurrent = 3,
  config = {}
}: UseBatchLazyLoadOptions) {
  const [loadingQueue, setLoadingQueue] = useState<string[]>([])
  const [loadedItems, setLoadedItems] = useState<Set<string>>(new Set())
  const [errorItems, setErrorItems] = useState<Map<string, Error>>(new Map())

  const addToQueue = useCallback((id: string) => {
    setLoadingQueue(prev => {
      if (!prev.includes(id) && !loadedItems.has(id)) {
        return [...prev, id]
      }
      return prev
    })
  }, [loadedItems])

  const removeFromQueue = useCallback((id: string) => {
    setLoadingQueue(prev => prev.filter(item => item !== id))
  }, [])

  const markAsLoaded = useCallback((id: string) => {
    setLoadedItems(prev => new Set([...prev, id]))
    removeFromQueue(id)
  }, [removeFromQueue])

  const markAsError = useCallback((id: string, error: Error) => {
    setErrorItems(prev => new Map([...prev, [id, error]]))
    removeFromQueue(id)
  }, [removeFromQueue])

  // 处理加载队列
  useEffect(() => {
    const currentLoading = loadingQueue.slice(0, maxConcurrent)

    currentLoading.forEach(async (id) => {
      const item = items.find(item => item.id === id)
      if (!item) return

      try {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('加载失败'))
          img.src = item.thumbnailUrl
        })
        markAsLoaded(id)
      } catch (error) {
        markAsError(id, error instanceof Error ? error : new Error('加载失败'))
      }
    })
  }, [loadingQueue, maxConcurrent, items, markAsLoaded, markAsError])

  return {
    addToQueue,
    loadedItems,
    errorItems,
    isLoading: loadingQueue.length > 0,
    queueSize: loadingQueue.length
  }
}
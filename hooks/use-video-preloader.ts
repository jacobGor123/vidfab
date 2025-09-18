/**
 * 智能视频预加载 Hook
 *
 * 这个Hook为React组件提供了完整的视频预加载功能，包括：
 * - 自动初始化和清理预加载器
 * - 实时性能监控和指标更新
 * - 响应式配置管理
 * - 错误处理和降级策略
 *
 * 使用示例：
 * ```tsx
 * const {
 *   preloadVideo,
 *   getPreloadedVideo,
 *   updateVisibleVideos,
 *   metrics,
 *   isInitialized
 * } = useVideoPreloader({
 *   maxConcurrentLoads: 3,
 *   memoryLimit: 100
 * })
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { SmartVideoPreloader } from '@/lib/video-preloader'
import {
  VideoItem,
  PreloadConfig,
  PerformanceMetrics,
  RealtimeMetrics,
  UseVideoPreloader,
  PreloadEventType,
  PreloadEvent
} from '@/types/video-preloader'

/**
 * 默认Hook配置
 */
const DEFAULT_HOOK_CONFIG: Partial<PreloadConfig> = {
  maxConcurrentLoads: 3,
  visibilityThreshold: 0.1,
  priorityDistance: 800,
  memoryLimit: 100,
  networkAware: true,
  performanceAware: true,
  maxQueueSize: 20,
  loadTimeout: 30000,
  idleCallbackTimeout: 5000
}

/**
 * 智能视频预加载Hook
 */
export function useVideoPreloader(
  initialConfig: Partial<PreloadConfig> = {}
): UseVideoPreloader {
  // ===== 状态管理 =====

  const [isInitialized, setIsInitialized] = useState(false)
  const [config, setConfig] = useState<PreloadConfig>({
    ...DEFAULT_HOOK_CONFIG,
    ...initialConfig
  } as PreloadConfig)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    hitRate: 0,
    averageLoadTime: 0,
    averageHoverDelay: 0,
    memoryUsage: 0,
    bandwidthUsage: 0,
    successRate: 0,
    cancellationRate: 0,
    totalPreloads: 0,
    failureCount: 0
  })
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({
    currentConcurrentLoads: 0,
    queueLength: 0,
    currentMemoryUsage: 0,
    currentNetworkUsage: 0,
    recentHitRate: 0,
    recentAverageDelay: 0
  })

  // ===== Refs =====

  const preloaderRef = useRef<SmartVideoPreloader | null>(null)
  const metricsUpdateIntervalRef = useRef<number | null>(null)
  const errorCountRef = useRef(0)
  const lastErrorTimeRef = useRef(0)

  // ===== 预加载器初始化 =====

  useEffect(() => {
    // 创建预加载器实例
    const preloader = new SmartVideoPreloader(config)
    preloaderRef.current = preloader

    // 设置事件监听器
    const handleMetricsUpdate = (event: PreloadEvent) => {
      if (event.data?.metrics) {
        setMetrics(event.data.metrics)
      }
    }

    const handleConfigUpdate = (event: PreloadEvent) => {
      if (event.data?.newConfig) {
        setConfig(event.data.newConfig)
      }
    }

    const handleError = (event: PreloadEvent) => {
      const now = Date.now()
      errorCountRef.current++

      // 错误率过高时的降级策略
      if (errorCountRef.current > 5 && now - lastErrorTimeRef.current < 60000) {
        console.warn('预加载错误率过高，启用降级模式')
        preloader.updateConfig({
          maxConcurrentLoads: 1,
          loadTimeout: 60000,
          memoryLimit: 50
        })
        errorCountRef.current = 0
      }

      lastErrorTimeRef.current = now
    }

    preloader.addEventListener(PreloadEventType.MetricsUpdate, handleMetricsUpdate)
    preloader.addEventListener(PreloadEventType.ConfigUpdate, handleConfigUpdate)
    preloader.addEventListener(PreloadEventType.LoadError, handleError)

    // 初始化预加载器
    preloader.initialize(config)
    setIsInitialized(true)

    // 启动实时指标更新
    const updateRealtimeMetrics = () => {
      if (preloaderRef.current) {
        setRealtimeMetrics(preloaderRef.current.getRealtimeMetrics())
      }
    }

    metricsUpdateIntervalRef.current = window.setInterval(updateRealtimeMetrics, 2000)

    console.log('视频预加载Hook已初始化')

    // 清理函数
    return () => {
      if (metricsUpdateIntervalRef.current) {
        clearInterval(metricsUpdateIntervalRef.current)
        metricsUpdateIntervalRef.current = null
      }

      preloader.removeEventListener(PreloadEventType.MetricsUpdate, handleMetricsUpdate)
      preloader.removeEventListener(PreloadEventType.ConfigUpdate, handleConfigUpdate)
      preloader.removeEventListener(PreloadEventType.LoadError, handleError)
      preloader.destroy()
      preloaderRef.current = null
      setIsInitialized(false)

      console.log('视频预加载Hook已清理')
    }
  }, []) // 空依赖数组，确保只在挂载时初始化一次

  // ===== 核心功能函数 =====

  const preloadVideo = useCallback(async (video: VideoItem): Promise<HTMLVideoElement> => {
    if (!preloaderRef.current) {
      throw new Error('预加载器未初始化')
    }

    try {
      return await preloaderRef.current.preloadVideo(video)
    } catch (error) {
      console.error('视频预加载失败:', error)
      throw error
    }
  }, [])

  const getPreloadedVideo = useCallback((videoId: string | number): HTMLVideoElement | null => {
    if (!preloaderRef.current) {
      return null
    }

    return preloaderRef.current.getPreloadedVideo(videoId)
  }, [])

  const updateVisibleVideos = useCallback((videos: VideoItem[]): void => {
    if (!preloaderRef.current) {
      return
    }

    preloaderRef.current.updateVisibleVideos(videos)

    // 自动预加载可见的视频
    videos.forEach(video => {
      // 使用setTimeout避免阻塞UI
      setTimeout(() => {
        if (preloaderRef.current) {
          preloaderRef.current.preloadVideo(video).catch(error => {
            console.warn(`自动预加载失败: ${video.id}`, error)
          })
        }
      }, 0)
    })
  }, [])

  const cancelPreload = useCallback((videoId: string | number): void => {
    if (!preloaderRef.current) {
      return
    }

    preloaderRef.current.cancelPreload(videoId)
  }, [])

  const updateConfig = useCallback((newConfig: Partial<PreloadConfig>): void => {
    if (!preloaderRef.current) {
      return
    }

    preloaderRef.current.updateConfig(newConfig)
  }, [])

  // ===== 智能预加载策略 =====

  const preloadVisibleVideos = useCallback(async (videos: VideoItem[]): Promise<void> => {
    if (!preloaderRef.current || videos.length === 0) {
      return
    }

    // 按优先级排序视频
    const sortedVideos = [...videos].sort((a, b) => {
      // 可以根据实际需求调整排序逻辑
      const aPriority = (a.priority || 0) + (a.fileSize ? 50 - Math.min(a.fileSize / (1024 * 1024), 50) : 0)
      const bPriority = (b.priority || 0) + (b.fileSize ? 50 - Math.min(b.fileSize / (1024 * 1024), 50) : 0)
      return bPriority - aPriority
    })

    // 限制并发预加载数量
    const maxPreloads = Math.min(sortedVideos.length, config.maxConcurrentLoads)
    const preloadPromises: Promise<void>[] = []

    for (let i = 0; i < maxPreloads; i++) {
      const video = sortedVideos[i]
      if (!video) continue

      const preloadPromise = preloaderRef.current.preloadVideo(video)
        .then(() => {
          console.log(`预加载完成: ${video.id}`)
        })
        .catch(error => {
          console.warn(`预加载失败: ${video.id}`, error)
        })

      preloadPromises.push(preloadPromise)
    }

    // 等待所有预加载完成（或失败）
    await Promise.allSettled(preloadPromises)
  }, [config.maxConcurrentLoads])

  // ===== 内存优化 =====

  const optimizeMemoryUsage = useCallback((): void => {
    if (!preloaderRef.current) {
      return
    }

    const currentMemory = realtimeMetrics.currentMemoryUsage
    const memoryLimit = config.memoryLimit

    if (currentMemory > memoryLimit * 0.8) {
      console.warn('内存使用接近限制，开始清理')

      // 暂停新的预加载
      preloaderRef.current.pauseAll()

      // 清理部分队列
      const queue = preloaderRef.current.getQueue()
      const itemsToRemove = queue
        .filter(item => item.status === 'pending')
        .slice(Math.floor(queue.length / 2)) // 移除一半待处理的项目

      itemsToRemove.forEach(item => {
        preloaderRef.current?.removeFromQueue(item.video.id)
      })

      // 1秒后恢复预加载
      setTimeout(() => {
        preloaderRef.current?.resumeAll()
      }, 1000)
    }
  }, [realtimeMetrics.currentMemoryUsage, config.memoryLimit])

  // 监控内存使用，自动优化
  useEffect(() => {
    optimizeMemoryUsage()
  }, [realtimeMetrics.currentMemoryUsage, optimizeMemoryUsage])

  // ===== 性能监控和调试 =====

  const getDebugInfo = useCallback(() => {
    if (!preloaderRef.current) {
      return null
    }

    return preloaderRef.current.getDebugInfo()
  }, [])

  const exportMetrics = useCallback(() => {
    const debugInfo = getDebugInfo()
    const exportData = {
      timestamp: new Date().toISOString(),
      config,
      metrics,
      realtimeMetrics,
      debugInfo
    }

    // 可以将数据导出为JSON文件或发送到分析服务
    console.log('预加载器性能数据:', exportData)
    return exportData
  }, [config, metrics, realtimeMetrics, getDebugInfo])

  // ===== 网络感知优化 =====

  const adaptToNetworkConditions = useCallback(() => {
    if (!preloaderRef.current || !config.networkAware) {
      return
    }

    // 检测网络条件并调整配置
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection
      const isSlowNetwork = connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g'
      const isSaveDataMode = connection.saveData

      if (isSlowNetwork || isSaveDataMode) {
        preloaderRef.current.updateConfig({
          maxConcurrentLoads: 1,
          memoryLimit: 30,
          loadTimeout: 60000
        })
      } else if (connection.effectiveType === '4g' && connection.downlink > 10) {
        preloaderRef.current.updateConfig({
          maxConcurrentLoads: 5,
          memoryLimit: 150,
          loadTimeout: 20000
        })
      }
    }
  }, [config.networkAware])

  // 监听网络状态变化
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection
      const handleNetworkChange = () => {
        console.log('网络状态变化，重新优化配置')
        adaptToNetworkConditions()
      }

      connection.addEventListener('change', handleNetworkChange)
      return () => {
        connection.removeEventListener('change', handleNetworkChange)
      }
    }
  }, [adaptToNetworkConditions])

  // ===== 批量预加载策略 =====

  const batchPreloadInitial = useCallback(async (videos: VideoItem[]): Promise<void> => {
    if (!preloaderRef.current || videos.length === 0) {
      return
    }

    console.log('🚀 Hook触发激进预加载策略')
    await preloaderRef.current.batchPreloadInitial(videos)
  }, [])

  const batchPreloadRemaining = useCallback(async (videos: VideoItem[]): Promise<void> => {
    if (!preloaderRef.current || videos.length === 0) {
      return
    }

    console.log('📦 Hook触发渐进式预加载')
    await preloaderRef.current.batchPreloadRemaining(videos)
  }, [])

  // ===== 返回Hook接口 =====

  return useMemo(() => ({
    preloader: preloaderRef.current,
    config,
    metrics,
    realtimeMetrics,
    isInitialized,
    preloadVideo,
    getPreloadedVideo,
    updateVisibleVideos,
    cancelPreload,
    updateConfig,
    // 额外的便利方法
    preloadVisibleVideos,
    optimizeMemoryUsage,
    getDebugInfo,
    exportMetrics,
    adaptToNetworkConditions,
    // 批量预加载方法
    batchPreloadInitial,
    batchPreloadRemaining
  }), [
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
    adaptToNetworkConditions,
    batchPreloadInitial,
    batchPreloadRemaining
  ])
}

/**
 * 轻量级的视频预加载Hook
 * 适用于简单场景，只提供基础的预加载功能
 */
export function useSimpleVideoPreloader() {
  const [preloadedVideos, setPreloadedVideos] = useState<Map<string | number, HTMLVideoElement>>(new Map())

  const preloadVideo = useCallback(async (video: VideoItem): Promise<HTMLVideoElement> => {
    // 检查是否已经预加载
    const existing = preloadedVideos.get(video.id)
    if (existing) {
      return existing
    }

    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video')
      videoElement.crossOrigin = 'anonymous'
      videoElement.preload = 'auto'
      videoElement.muted = true

      const onCanPlayThrough = () => {
        setPreloadedVideos(prev => new Map(prev).set(video.id, videoElement))
        resolve(videoElement)
      }

      const onError = () => {
        reject(new Error(`视频加载失败: ${video.videoUrl}`))
      }

      videoElement.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
      videoElement.addEventListener('error', onError, { once: true })
      videoElement.src = video.videoUrl
    })
  }, [preloadedVideos])

  const getPreloadedVideo = useCallback((videoId: string | number): HTMLVideoElement | null => {
    return preloadedVideos.get(videoId) || null
  }, [preloadedVideos])

  const clearPreloadedVideos = useCallback(() => {
    setPreloadedVideos(new Map())
  }, [])

  return {
    preloadVideo,
    getPreloadedVideo,
    clearPreloadedVideos,
    preloadedCount: preloadedVideos.size
  }
}

/**
 * 视频预加载状态Hook
 * 用于跟踪单个视频的预加载状态
 */
export function useVideoPreloadStatus(videoId: string | number) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const preloadVideo = useCallback(async (videoUrl: string): Promise<HTMLVideoElement> => {
    setStatus('loading')
    setProgress(0)
    setError(null)

    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video')
      videoElement.crossOrigin = 'anonymous'
      videoElement.preload = 'auto'
      videoElement.muted = true

      const onProgress = () => {
        if (videoElement.buffered.length > 0) {
          const buffered = videoElement.buffered.end(0)
          const duration = videoElement.duration || 1
          setProgress(Math.min(buffered / duration, 1))
        }
      }

      const onCanPlayThrough = () => {
        setStatus('loaded')
        setProgress(1)
        resolve(videoElement)
      }

      const onError = () => {
        const errorMsg = `视频加载失败: ${videoUrl}`
        setStatus('error')
        setError(errorMsg)
        reject(new Error(errorMsg))
      }

      videoElement.addEventListener('progress', onProgress)
      videoElement.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
      videoElement.addEventListener('error', onError, { once: true })
      videoElement.src = videoUrl
    })
  }, [])

  return {
    status,
    progress,
    error,
    preloadVideo
  }
}
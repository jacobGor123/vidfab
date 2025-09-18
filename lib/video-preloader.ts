/**
 * 智能视频预加载引擎
 *
 * 这是一个高度优化的视频预加载系统，具有以下核心特性：
 * - 智能预加载策略：基于可见性、网络条件和设备性能
 * - 资源管理：控制并发数量、内存使用和带宽消耗
 * - 性能监控：实时跟踪预加载效果和系统资源使用
 * - 事件驱动：提供完整的事件系统用于外部集成
 */

import {
  VideoItem,
  PreloadStatus,
  NetworkType,
  DevicePerformance,
  PreloadConfig,
  AdaptiveConfig,
  PreloadQueueItem,
  QueueManager,
  PerformanceMetrics,
  RealtimeMetrics,
  PreloadEventType,
  PreloadEvent,
  PreloadEventListener,
  VideoPreloader,
  NetworkInformation,
  MemoryInformation,
  VisibilityInfo,
  DebugInfo
} from '@/types/video-preloader'

/**
 * 默认预加载配置
 */
const DEFAULT_CONFIG: PreloadConfig = {
  maxConcurrentLoads: 3,
  visibilityThreshold: 0.1,
  priorityDistance: 800,
  memoryLimit: 100, // 100MB
  bandwidthLimit: 10, // 10Mbps
  networkAware: true,
  performanceAware: true,
  maxQueueSize: 20,
  loadTimeout: 30000, // 30秒
  idleCallbackTimeout: 5000 // 5秒
}

/**
 * 自适应配置：根据网络和设备性能动态调整
 */
const ADAPTIVE_CONFIG: AdaptiveConfig = {
  networkConfigs: {
    [NetworkType.Fast]: {
      maxConcurrentLoads: 5,
      memoryLimit: 150,
      loadTimeout: 20000
    },
    [NetworkType.Medium]: {
      maxConcurrentLoads: 3,
      memoryLimit: 100,
      loadTimeout: 30000
    },
    [NetworkType.Slow]: {
      maxConcurrentLoads: 1,
      memoryLimit: 50,
      loadTimeout: 60000
    },
    [NetworkType.SaveData]: {
      maxConcurrentLoads: 1,
      memoryLimit: 30,
      loadTimeout: 60000,
      visibilityThreshold: 0.5
    },
    [NetworkType.Unknown]: {
      maxConcurrentLoads: 2,
      memoryLimit: 75,
      loadTimeout: 45000
    }
  },
  performanceConfigs: {
    [DevicePerformance.High]: {
      maxConcurrentLoads: 5,
      memoryLimit: 200
    },
    [DevicePerformance.Medium]: {
      maxConcurrentLoads: 3,
      memoryLimit: 100
    },
    [DevicePerformance.Low]: {
      maxConcurrentLoads: 2,
      memoryLimit: 50
    }
  },
  memoryPressureConfigs: {
    low: {
      maxConcurrentLoads: 5,
      memoryLimit: 150
    },
    medium: {
      maxConcurrentLoads: 3,
      memoryLimit: 100
    },
    high: {
      maxConcurrentLoads: 1,
      memoryLimit: 50
    }
  }
}

/**
 * 智能视频预加载器实现
 */
export class SmartVideoPreloader implements VideoPreloader, QueueManager {
  private config: PreloadConfig
  private queue: Map<string | number, PreloadQueueItem> = new Map()
  private eventListeners: Map<PreloadEventType, PreloadEventListener[]> = new Map()
  private metrics: PerformanceMetrics
  private intersectionObserver: IntersectionObserver | null = null
  private visibleVideos: Map<string | number, VisibilityInfo> = new Map()
  private isInitialized = false
  private recentEvents: PreloadEvent[] = []
  private performanceMonitorInterval: number | null = null

  // 性能和网络监控
  private networkInfo: NetworkInformation = {}
  private memoryInfo: MemoryInformation = {}
  private devicePerformance: DevicePerformance = DevicePerformance.Medium

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.metrics = this.initializeMetrics()
    this.detectDeviceCapabilities()
  }

  // ===== 初始化和销毁 =====

  initialize(config: Partial<PreloadConfig> = {}): void {
    if (this.isInitialized) {
      console.warn('VideoPreloader已经初始化')
      return
    }

    this.updateConfig(config)
    this.setupIntersectionObserver()
    this.startPerformanceMonitoring()
    this.isInitialized = true

    this.emitEvent(PreloadEventType.ConfigUpdate, 'system', {
      config: this.config
    })

    console.log('智能视频预加载器已初始化', this.config)
  }

  destroy(): void {
    if (!this.isInitialized) return

    // 清理观察者
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }

    // 停止性能监控
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval)
      this.performanceMonitorInterval = null
    }

    // 取消所有预加载
    this.clearQueue()

    // 清理事件监听器
    this.eventListeners.clear()

    this.isInitialized = false
    console.log('视频预加载器已销毁')
  }

  // ===== 配置管理 =====

  updateConfig(config: Partial<PreloadConfig>): void {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...config }

    // 应用自适应配置
    this.applyAdaptiveConfig()

    this.emitEvent(PreloadEventType.ConfigUpdate, 'system', {
      oldConfig,
      newConfig: this.config
    })
  }

  getConfig(): PreloadConfig {
    return { ...this.config }
  }

  private applyAdaptiveConfig(): void {
    const networkType = this.detectNetworkType()
    const memoryPressure = this.detectMemoryPressure()

    // 应用网络配置
    const networkConfig = ADAPTIVE_CONFIG.networkConfigs[networkType]
    if (networkConfig) {
      Object.assign(this.config, networkConfig)
    }

    // 应用设备性能配置
    const performanceConfig = ADAPTIVE_CONFIG.performanceConfigs[this.devicePerformance]
    if (performanceConfig) {
      Object.assign(this.config, performanceConfig)
    }

    // 应用内存压力配置
    const memoryConfig = ADAPTIVE_CONFIG.memoryPressureConfigs[memoryPressure]
    if (memoryConfig) {
      Object.assign(this.config, memoryConfig)
    }
  }

  // ===== 核心预加载功能 =====

  async preloadVideo(video: VideoItem): Promise<HTMLVideoElement> {
    const existingItem = this.queue.get(video.id)

    // 如果已经预加载完成，直接返回
    if (existingItem?.status === PreloadStatus.Loaded && existingItem.videoElement) {
      return existingItem.videoElement
    }

    // 如果正在预加载，返回现有的Promise
    if (existingItem?.status === PreloadStatus.Loading) {
      return this.waitForLoad(video.id)
    }

    // 添加到队列并开始预加载
    this.addToQueue(video, this.calculatePriority(video))
    return this.executePreload(video.id)
  }

  private async executePreload(videoId: string | number): Promise<HTMLVideoElement> {
    const queueItem = this.queue.get(videoId)
    if (!queueItem) {
      throw new Error(`队列中找不到视频: ${videoId}`)
    }

    // 检查并发限制
    if (this.getCurrentConcurrentLoads() >= this.config.maxConcurrentLoads) {
      return this.waitForLoad(videoId)
    }

    queueItem.status = PreloadStatus.Loading
    queueItem.startedAt = Date.now()

    this.emitEvent(PreloadEventType.LoadStart, videoId)

    try {
      const videoElement = await this.loadVideoWithTimeout(queueItem)

      queueItem.status = PreloadStatus.Loaded
      queueItem.completedAt = Date.now()
      queueItem.videoElement = videoElement
      queueItem.progress = 1

      this.updateMetrics('success', queueItem)
      this.emitEvent(PreloadEventType.LoadComplete, videoId, { videoElement })

      return videoElement
    } catch (error) {
      queueItem.status = PreloadStatus.Error
      queueItem.error = error instanceof Error ? error.message : '未知错误'

      this.updateMetrics('failure', queueItem)
      this.emitEvent(PreloadEventType.LoadError, videoId, { error: queueItem.error })

      throw error
    }
  }

  private async loadVideoWithTimeout(queueItem: PreloadQueueItem): Promise<HTMLVideoElement> {
    const { video } = queueItem

    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video')
      videoElement.crossOrigin = 'anonymous'
      videoElement.preload = 'auto'
      videoElement.muted = true

      let timeoutId: number | null = null
      let isResolved = false

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId)
        videoElement.removeEventListener('canplaythrough', onCanPlayThrough)
        videoElement.removeEventListener('error', onError)
        videoElement.removeEventListener('progress', onProgress)
      }

      const resolve完成 = (element: HTMLVideoElement) => {
        if (isResolved) return
        isResolved = true
        cleanup()
        resolve(element)
      }

      const reject错误 = (error: Error) => {
        if (isResolved) return
        isResolved = true
        cleanup()
        reject(error)
      }

      const onCanPlayThrough = () => {
        resolve完成(videoElement)
      }

      const onError = () => {
        reject错误(new Error(`视频加载失败: ${video.videoUrl}`))
      }

      const onProgress = () => {
        if (videoElement.buffered.length > 0) {
          const buffered = videoElement.buffered.end(0)
          const duration = videoElement.duration || video.duration || 1
          queueItem.progress = Math.min(buffered / duration, 1)

          this.emitEvent(PreloadEventType.LoadProgress, video.id, {
            progress: queueItem.progress,
            buffered,
            duration
          })
        }
      }

      // 设置事件监听器
      videoElement.addEventListener('canplaythrough', onCanPlayThrough)
      videoElement.addEventListener('error', onError)
      videoElement.addEventListener('progress', onProgress)

      // 设置超时
      timeoutId = window.setTimeout(() => {
        reject错误(new Error('预加载超时'))
      }, this.config.loadTimeout)

      // 开始加载
      videoElement.src = video.videoUrl
    })
  }

  private async waitForLoad(videoId: string | number): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const queueItem = this.queue.get(videoId)
        if (!queueItem) {
          reject(new Error('视频已从队列中移除'))
          return
        }

        if (queueItem.status === PreloadStatus.Loaded && queueItem.videoElement) {
          resolve(queueItem.videoElement)
        } else if (queueItem.status === PreloadStatus.Error) {
          reject(new Error(queueItem.error || '预加载失败'))
        } else {
          // 继续等待
          setTimeout(checkStatus, 100)
        }
      }

      checkStatus()
    })
  }

  cancelPreload(videoId: string | number): void {
    const queueItem = this.queue.get(videoId)
    if (!queueItem) return

    if (queueItem.abortController) {
      queueItem.abortController.abort()
    }

    queueItem.status = PreloadStatus.Cancelled
    this.updateMetrics('cancellation', queueItem)
    this.emitEvent(PreloadEventType.LoadCancelled, videoId)
  }

  getPreloadedVideo(videoId: string | number): HTMLVideoElement | null {
    const queueItem = this.queue.get(videoId)
    return queueItem?.status === PreloadStatus.Loaded ? queueItem.videoElement || null : null
  }

  // ===== 队列管理 =====

  addToQueue(video: VideoItem, priority = 0): void {
    if (this.queue.size >= this.config.maxQueueSize) {
      this.removeLowestPriorityItem()
    }

    const priorityScore = this.calculatePriority(video, priority)
    const queueItem: PreloadQueueItem = {
      video,
      status: PreloadStatus.Pending,
      priorityScore,
      addedAt: Date.now(),
      progress: 0,
      abortController: new AbortController()
    }

    this.queue.set(video.id, queueItem)
    this.emitEvent(PreloadEventType.QueueUpdate, video.id)

    // 在浏览器空闲时执行预加载
    this.scheduleIdlePreload(video.id)
  }

  removeFromQueue(videoId: string | number): void {
    const queueItem = this.queue.get(videoId)
    if (!queueItem) return

    this.cancelPreload(videoId)
    this.queue.delete(videoId)
    this.emitEvent(PreloadEventType.QueueUpdate, videoId)
  }

  getQueue(): PreloadQueueItem[] {
    return Array.from(this.queue.values()).sort((a, b) => b.priorityScore - a.priorityScore)
  }

  getStatus(videoId: string | number): PreloadStatus {
    return this.queue.get(videoId)?.status || PreloadStatus.Pending
  }

  clearQueue(): void {
    this.queue.forEach((item, videoId) => {
      this.cancelPreload(videoId)
    })
    this.queue.clear()
    this.emitEvent(PreloadEventType.QueueUpdate, 'all')
  }

  pauseAll(): void {
    this.queue.forEach((item, videoId) => {
      if (item.status === PreloadStatus.Loading) {
        this.cancelPreload(videoId)
      }
    })
  }

  resumeAll(): void {
    this.queue.forEach((item, videoId) => {
      if (item.status === PreloadStatus.Cancelled) {
        item.status = PreloadStatus.Pending
        this.scheduleIdlePreload(videoId)
      }
    })
  }

  // ===== 可见性管理 =====

  updateVisibleVideos(videos: VideoItem[]): void {
    // 移除不再可见的视频
    const currentVideoIds = new Set(videos.map(v => v.id))
    const toRemove: (string | number)[] = []

    this.visibleVideos.forEach((_, videoId) => {
      if (!currentVideoIds.has(videoId)) {
        toRemove.push(videoId)
      }
    })

    toRemove.forEach(videoId => {
      this.visibleVideos.delete(videoId)
      // 降低不可见视频的优先级
      const queueItem = this.queue.get(videoId)
      if (queueItem && queueItem.status === PreloadStatus.Pending) {
        queueItem.priorityScore *= 0.5
      }
    })

    // 更新可见视频的优先级
    videos.forEach(video => {
      const queueItem = this.queue.get(video.id)
      if (queueItem) {
        queueItem.priorityScore = this.calculatePriority(video)
      }
    })
  }

  // ===== 优先级计算 =====

  private calculatePriority(video: VideoItem, basePriority = 0): number {
    let priority = basePriority

    // 基于可见性的优先级
    const visibilityInfo = this.visibleVideos.get(video.id)
    if (visibilityInfo) {
      priority += visibilityInfo.intersectionRatio * 100

      // 距离越近优先级越高
      const distance = Math.min(visibilityInfo.distanceFromTop, visibilityInfo.distanceFromBottom)
      if (distance < this.config.priorityDistance) {
        priority += (this.config.priorityDistance - distance) / 10
      }
    }

    // 基于文件大小的优先级调整（小文件优先）
    if (video.fileSize) {
      const sizeMB = video.fileSize / (1024 * 1024)
      priority += Math.max(0, 50 - sizeMB) // 文件越小优先级越高
    }

    // 基于视频时长的优先级调整（短视频优先）
    if (video.duration) {
      priority += Math.max(0, 30 - video.duration) // 时长越短优先级越高
    }

    return priority
  }

  private removeLowestPriorityItem(): void {
    let lowestPriority = Infinity
    let lowestPriorityId: string | number | null = null

    this.queue.forEach((item, videoId) => {
      if (item.status === PreloadStatus.Pending && item.priorityScore < lowestPriority) {
        lowestPriority = item.priorityScore
        lowestPriorityId = videoId
      }
    })

    if (lowestPriorityId !== null) {
      this.removeFromQueue(lowestPriorityId)
    }
  }

  // ===== 智能调度 =====

  private scheduleIdlePreload(videoId: string | number): void {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback((deadline) => {
        if (deadline.timeRemaining() > 0) {
          this.executePreloadIfReady(videoId)
        } else {
          // 如果没有空闲时间，延迟执行
          setTimeout(() => this.scheduleIdlePreload(videoId), 1000)
        }
      }, { timeout: this.config.idleCallbackTimeout })
    } else {
      // 如果不支持requestIdleCallback，使用setTimeout
      setTimeout(() => this.executePreloadIfReady(videoId), 100)
    }
  }

  private async executePreloadIfReady(videoId: string | number): Promise<void> {
    const queueItem = this.queue.get(videoId)
    if (!queueItem || queueItem.status !== PreloadStatus.Pending) {
      return
    }

    // 检查资源限制
    if (this.getCurrentConcurrentLoads() >= this.config.maxConcurrentLoads) {
      return
    }

    if (this.getCurrentMemoryUsage() >= this.config.memoryLimit) {
      return
    }

    try {
      await this.executePreload(videoId)
    } catch (error) {
      console.warn(`预加载失败: ${videoId}`, error)
    }
  }

  // ===== 批量预加载 =====

  /**
   * 初始化时的激进预加载策略
   * 根据网络条件批量预加载前N个视频
   */
  async batchPreloadInitial(videos: VideoItem[]): Promise<void> {
    if (!this.isInitialized || videos.length === 0) {
      return
    }

    // 根据网络类型确定初始预加载数量
    const networkType = this.detectNetworkType()
    const initialPreloadCount = this.getInitialPreloadCount(networkType)

    console.log(`🚀 开始激进预加载策略: 预加载前${initialPreloadCount}个视频 (网络类型: ${networkType})`)

    // 按位置优先级排序（顶部优先）
    const sortedVideos = [...videos]
      .slice(0, initialPreloadCount)
      .map((video, index) => ({
        ...video,
        positionPriority: 1000 - index // 位置越靠前优先级越高
      }))

    // 批量添加到预加载队列
    for (const video of sortedVideos) {
      // 计算初始优先级：位置权重 + 文件大小权重
      const basePriority = video.positionPriority + this.calculateFileSizePriority(video)
      this.addToQueue(video, basePriority)
    }

    // 立即开始预加载（不等待空闲时间）
    this.executeImmediatePreload()

    this.emitEvent(PreloadEventType.BatchStart, 'system', {
      count: initialPreloadCount,
      networkType,
      videos: sortedVideos.map(v => v.id)
    })
  }

  /**
   * 渐进式预加载剩余视频
   */
  async batchPreloadRemaining(videos: VideoItem[]): Promise<void> {
    if (!this.isInitialized) return

    const networkType = this.detectNetworkType()
    const initialCount = this.getInitialPreloadCount(networkType)
    const remainingVideos = videos.slice(initialCount)

    if (remainingVideos.length === 0) return

    console.log(`📦 开始渐进式预加载: ${remainingVideos.length}个剩余视频`)

    // 以更低的优先级添加剩余视频
    for (let i = 0; i < remainingVideos.length; i++) {
      const video = remainingVideos[i]
      const lowPriority = 100 - i // 较低的基础优先级
      this.addToQueue(video, lowPriority)
    }

    // 使用空闲时间调度预加载
    this.scheduleProgressivePreload(remainingVideos)
  }

  private getInitialPreloadCount(networkType: NetworkType): number {
    switch (networkType) {
      case NetworkType.Fast: // WiFi/4G
        return 12
      case NetworkType.Medium: // 3G
        return 6
      case NetworkType.Slow: // 2G
        return 3
      case NetworkType.SaveData: // 节省流量模式
        return 2
      default:
        return 4
    }
  }

  private calculateFileSizePriority(video: VideoItem): number {
    if (!video.fileSize) return 0

    const sizeMB = video.fileSize / (1024 * 1024)
    // 小文件优先：10MB以下=50分，10-20MB=25分，20MB以上=0分
    if (sizeMB <= 10) return 50
    if (sizeMB <= 20) return 25
    return 0
  }

  private executeImmediatePreload(): void {
    // 立即执行前几个优先级最高的预加载
    const sortedQueue = this.getQueue()
    const immediateCount = Math.min(this.config.maxConcurrentLoads, sortedQueue.length)

    for (let i = 0; i < immediateCount; i++) {
      const queueItem = sortedQueue[i]
      if (queueItem.status === PreloadStatus.Pending) {
        this.executePreloadIfReady(queueItem.video.id)
      }
    }
  }

  private scheduleProgressivePreload(videos: VideoItem[]): void {
    let currentIndex = 0

    const scheduleNext = () => {
      if (currentIndex >= videos.length) return

      const video = videos[currentIndex]
      currentIndex++

      // 使用更长的延迟来避免影响主要预加载
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
          this.executePreloadIfReady(video.id)
          // 继续调度下一个
          setTimeout(scheduleNext, 2000) // 2秒间隔
        }, { timeout: 10000 })
      } else {
        setTimeout(() => {
          this.executePreloadIfReady(video.id)
          setTimeout(scheduleNext, 2000)
        }, 1000)
      }
    }

    scheduleNext()
  }

  // ===== 性能监控 =====

  private initializeMetrics(): PerformanceMetrics {
    return {
      hitRate: 0,
      averageLoadTime: 0,
      averageHoverDelay: 0,
      memoryUsage: 0,
      bandwidthUsage: 0,
      successRate: 0,
      cancellationRate: 0,
      totalPreloads: 0,
      failureCount: 0
    }
  }

  private updateMetrics(type: 'success' | 'failure' | 'cancellation', queueItem: PreloadQueueItem): void {
    this.metrics.totalPreloads++

    switch (type) {
      case 'success':
        if (queueItem.startedAt && queueItem.completedAt) {
          const loadTime = queueItem.completedAt - queueItem.startedAt
          this.metrics.averageLoadTime =
            (this.metrics.averageLoadTime * (this.metrics.totalPreloads - 1) + loadTime) / this.metrics.totalPreloads
        }
        break

      case 'failure':
        this.metrics.failureCount++
        break

      case 'cancellation':
        // 取消不计入失败，但会影响成功率
        break
    }

    // 更新成功率
    const successCount = this.metrics.totalPreloads - this.metrics.failureCount
    this.metrics.successRate = successCount / this.metrics.totalPreloads

    // 更新取消率
    const cancelledCount = Array.from(this.queue.values()).filter(
      item => item.status === PreloadStatus.Cancelled
    ).length
    this.metrics.cancellationRate = cancelledCount / this.metrics.totalPreloads

    this.emitEvent(PreloadEventType.MetricsUpdate, 'system', { metrics: this.metrics })
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitorInterval = window.setInterval(() => {
      this.updateNetworkInfo()
      this.updateMemoryInfo()
      this.updateRealtimeMetrics()
    }, 5000) // 每5秒更新一次
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getRealtimeMetrics(): RealtimeMetrics {
    return {
      currentConcurrentLoads: this.getCurrentConcurrentLoads(),
      queueLength: this.queue.size,
      currentMemoryUsage: this.getCurrentMemoryUsage(),
      currentNetworkUsage: this.getCurrentNetworkUsage(),
      recentHitRate: this.calculateRecentHitRate(),
      recentAverageDelay: this.calculateRecentAverageDelay()
    }
  }

  private getCurrentConcurrentLoads(): number {
    return Array.from(this.queue.values()).filter(
      item => item.status === PreloadStatus.Loading
    ).length
  }

  private getCurrentMemoryUsage(): number {
    if (this.memoryInfo.usedJSHeapSize) {
      return this.memoryInfo.usedJSHeapSize / (1024 * 1024) // 转换为MB
    }
    return 0
  }

  private getCurrentNetworkUsage(): number {
    // 简化的网络使用计算，实际项目中可以更精确
    return this.getCurrentConcurrentLoads() * 2 // 假设每个预加载使用2Mbps
  }

  private calculateRecentHitRate(): number {
    // 计算最近1分钟的命中率
    const oneMinuteAgo = Date.now() - 60000
    const recentEvents = this.recentEvents.filter(event => event.timestamp > oneMinuteAgo)

    const loadCompleteEvents = recentEvents.filter(event => event.type === PreloadEventType.LoadComplete)
    const totalRecentPreloads = recentEvents.filter(event => event.type === PreloadEventType.LoadStart).length

    return totalRecentPreloads > 0 ? loadCompleteEvents.length / totalRecentPreloads : 0
  }

  private calculateRecentAverageDelay(): number {
    // 简化版本，实际项目中需要跟踪hover事件到播放的延迟
    return this.metrics.averageHoverDelay
  }

  // ===== 设备能力检测 =====

  private detectDeviceCapabilities(): void {
    // 检测设备性能
    if (typeof navigator !== 'undefined') {
      const memory = (navigator as any).deviceMemory
      const cores = navigator.hardwareConcurrency || 1

      if (memory >= 8 && cores >= 4) {
        this.devicePerformance = DevicePerformance.High
      } else if (memory >= 4 && cores >= 2) {
        this.devicePerformance = DevicePerformance.Medium
      } else {
        this.devicePerformance = DevicePerformance.Low
      }
    }
  }

  private detectNetworkType(): NetworkType {
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection
      if (connection) {
        if (connection.saveData) return NetworkType.SaveData

        switch (connection.effectiveType) {
          case '4g': return NetworkType.Fast
          case '3g': return NetworkType.Medium
          case '2g':
          case 'slow-2g': return NetworkType.Slow
          default: return NetworkType.Unknown
        }
      }
    }
    return NetworkType.Unknown
  }

  private detectMemoryPressure(): 'low' | 'medium' | 'high' {
    if (this.memoryInfo.usedJSHeapSize && this.memoryInfo.jsHeapSizeLimit) {
      const usage = this.memoryInfo.usedJSHeapSize / this.memoryInfo.jsHeapSizeLimit
      if (usage > 0.8) return 'high'
      if (usage > 0.5) return 'medium'
      return 'low'
    }
    return 'medium'
  }

  private updateNetworkInfo(): void {
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection
      if (connection) {
        this.networkInfo = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
      }
    }
  }

  private updateMemoryInfo(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      this.memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
  }

  private updateRealtimeMetrics(): void {
    // 更新内存使用指标
    this.metrics.memoryUsage = this.getCurrentMemoryUsage()
    this.metrics.bandwidthUsage = this.getCurrentNetworkUsage()
  }

  // ===== Intersection Observer =====

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver不支持，将跳过可见性检测')
      return
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoId = entry.target.getAttribute('data-video-id')
          if (!videoId) return

          const visibilityInfo: VisibilityInfo = {
            isVisible: entry.isIntersecting,
            distanceFromTop: entry.boundingClientRect.top,
            distanceFromBottom: window.innerHeight - entry.boundingClientRect.bottom,
            intersectionRatio: entry.intersectionRatio
          }

          if (entry.isIntersecting) {
            this.visibleVideos.set(videoId, visibilityInfo)

            // 更新队列中对应视频的优先级
            const queueItem = this.queue.get(videoId)
            if (queueItem) {
              queueItem.priorityScore = this.calculatePriority(queueItem.video)
            }
          } else {
            this.visibleVideos.delete(videoId)
          }
        })
      },
      {
        threshold: [0, this.config.visibilityThreshold, 0.5, 1.0],
        rootMargin: `${this.config.priorityDistance}px`
      }
    )
  }

  // ===== 事件系统 =====

  addEventListener(type: PreloadEventType, listener: PreloadEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    this.eventListeners.get(type)!.push(listener)
  }

  removeEventListener(type: PreloadEventType, listener: PreloadEventListener): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emitEvent(type: PreloadEventType, videoId: string | number, data?: any): void {
    const event: PreloadEvent = {
      type,
      videoId,
      timestamp: Date.now(),
      data
    }

    // 添加到最近事件日志
    this.recentEvents.push(event)
    if (this.recentEvents.length > 100) {
      this.recentEvents.shift()
    }

    // 触发事件监听器
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error(`事件监听器错误 (${type}):`, error)
        }
      })
    }
  }

  // ===== 调试工具 =====

  getDebugInfo(): DebugInfo {
    return {
      queue: this.getQueue(),
      config: this.getConfig(),
      metrics: this.getMetrics(),
      networkInfo: this.networkInfo,
      memoryInfo: this.memoryInfo,
      recentEvents: this.recentEvents.slice(-20) // 最近20个事件
    }
  }
}
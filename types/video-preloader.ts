/**
 * 视频预加载器类型定义
 *
 * 这个文件定义了视频预加载系统所需的所有类型和接口，
 * 包括预加载策略、性能监控、队列管理等核心功能的类型定义。
 */

// ===== 基础类型定义 =====

/**
 * 视频项目接口 - 用于预加载队列中的视频项
 */
export interface VideoItem {
  /** 唯一标识符 */
  id: string | number
  /** 视频URL */
  videoUrl: string
  /** 缩略图URL */
  thumbnailUrl: string
  /** 视频时长（秒） */
  duration?: number
  /** 视频文件大小（字节） */
  fileSize?: number
  /** 优先级权重 */
  priority?: number
}

/**
 * 预加载状态枚举
 */
export enum PreloadStatus {
  /** 等待预加载 */
  Pending = 'pending',
  /** 正在预加载 */
  Loading = 'loading',
  /** 预加载完成 */
  Loaded = 'loaded',
  /** 预加载失败 */
  Error = 'error',
  /** 已取消预加载 */
  Cancelled = 'cancelled'
}

/**
 * 网络连接类型
 */
export enum NetworkType {
  /** 高速网络（WiFi、以太网） */
  Fast = 'fast',
  /** 中等速度网络（4G） */
  Medium = 'medium',
  /** 慢速网络（3G、2G） */
  Slow = 'slow',
  /** 保存流量模式 */
  SaveData = 'save-data',
  /** 未知网络类型 */
  Unknown = 'unknown'
}

/**
 * 设备性能等级
 */
export enum DevicePerformance {
  /** 高性能设备 */
  High = 'high',
  /** 中等性能设备 */
  Medium = 'medium',
  /** 低性能设备 */
  Low = 'low'
}

// ===== 预加载策略配置 =====

/**
 * 预加载策略配置
 */
export interface PreloadConfig {
  /** 最大并发预加载数量 */
  maxConcurrentLoads: number
  /** 可见区域检测阈值 */
  visibilityThreshold: number
  /** 预加载优先级距离（像素） */
  priorityDistance: number
  /** 内存使用限制（MB） */
  memoryLimit: number
  /** 带宽使用限制（Mbps） */
  bandwidthLimit?: number
  /** 是否启用网络感知预加载 */
  networkAware: boolean
  /** 是否启用设备性能感知 */
  performanceAware: boolean
  /** 预加载队列最大长度 */
  maxQueueSize: number
  /** 预加载超时时间（毫秒） */
  loadTimeout: number
  /** 空闲回调等待时间（毫秒） */
  idleCallbackTimeout: number
}

/**
 * 动态配置调整规则
 */
export interface AdaptiveConfig {
  /** 网络类型对应的配置调整 */
  networkConfigs: Record<NetworkType, Partial<PreloadConfig>>
  /** 设备性能对应的配置调整 */
  performanceConfigs: Record<DevicePerformance, Partial<PreloadConfig>>
  /** 内存压力对应的配置调整 */
  memoryPressureConfigs: {
    low: Partial<PreloadConfig>
    medium: Partial<PreloadConfig>
    high: Partial<PreloadConfig>
  }
}

// ===== 预加载队列管理 =====

/**
 * 预加载队列项
 */
export interface PreloadQueueItem {
  /** 视频项信息 */
  video: VideoItem
  /** 当前状态 */
  status: PreloadStatus
  /** 优先级分数（越高越优先） */
  priorityScore: number
  /** 添加到队列的时间戳 */
  addedAt: number
  /** 开始预加载的时间戳 */
  startedAt?: number
  /** 完成预加载的时间戳 */
  completedAt?: number
  /** 错误信息 */
  error?: string
  /** 预加载进度（0-1） */
  progress: number
  /** 视频元素引用 */
  videoElement?: HTMLVideoElement
  /** 取消预加载的控制器 */
  abortController?: AbortController
}

/**
 * 队列管理器接口
 */
export interface QueueManager {
  /** 添加视频到预加载队列 */
  addToQueue(video: VideoItem, priority?: number): void
  /** 从队列中移除视频 */
  removeFromQueue(videoId: string | number): void
  /** 获取队列中的所有项目 */
  getQueue(): PreloadQueueItem[]
  /** 获取指定视频的预加载状态 */
  getStatus(videoId: string | number): PreloadStatus
  /** 清空队列 */
  clearQueue(): void
  /** 暂停所有预加载 */
  pauseAll(): void
  /** 恢复所有预加载 */
  resumeAll(): void
}

// ===== 性能监控 =====

/**
 * 性能指标数据
 */
export interface PerformanceMetrics {
  /** 预加载命中率（用户悬停时视频已预加载的比例） */
  hitRate: number
  /** 平均预加载时间（毫秒） */
  averageLoadTime: number
  /** 平均悬停到播放延迟（毫秒） */
  averageHoverDelay: number
  /** 内存使用量（MB） */
  memoryUsage: number
  /** 网络带宽使用量（Mbps） */
  bandwidthUsage: number
  /** 预加载成功率 */
  successRate: number
  /** 预加载取消率 */
  cancellationRate: number
  /** 总预加载次数 */
  totalPreloads: number
  /** 失败次数 */
  failureCount: number
}

/**
 * 实时性能指标
 */
export interface RealtimeMetrics {
  /** 当前并发预加载数 */
  currentConcurrentLoads: number
  /** 队列长度 */
  queueLength: number
  /** 当前内存使用 */
  currentMemoryUsage: number
  /** 当前网络使用 */
  currentNetworkUsage: number
  /** 最近1分钟的命中率 */
  recentHitRate: number
  /** 最近1分钟的平均延迟 */
  recentAverageDelay: number
}

// ===== 事件系统 =====

/**
 * 预加载事件类型
 */
export enum PreloadEventType {
  /** 开始预加载 */
  LoadStart = 'loadStart',
  /** 预加载进度更新 */
  LoadProgress = 'loadProgress',
  /** 预加载完成 */
  LoadComplete = 'loadComplete',
  /** 预加载失败 */
  LoadError = 'loadError',
  /** 预加载取消 */
  LoadCancelled = 'loadCancelled',
  /** 队列更新 */
  QueueUpdate = 'queueUpdate',
  /** 配置更新 */
  ConfigUpdate = 'configUpdate',
  /** 性能指标更新 */
  MetricsUpdate = 'metricsUpdate',
  /** 批量预加载开始 */
  BatchStart = 'batchStart'
}

/**
 * 预加载事件数据
 */
export interface PreloadEvent {
  /** 事件类型 */
  type: PreloadEventType
  /** 视频ID */
  videoId: string | number
  /** 时间戳 */
  timestamp: number
  /** 事件数据 */
  data?: any
  /** 错误信息（如果适用） */
  error?: string
}

/**
 * 事件监听器类型
 */
export type PreloadEventListener = (event: PreloadEvent) => void

// ===== 主要接口 =====

/**
 * 视频预加载器主接口
 */
export interface VideoPreloader {
  /** 初始化预加载器 */
  initialize(config: Partial<PreloadConfig>): void
  /** 销毁预加载器 */
  destroy(): void
  /** 预加载指定视频 */
  preloadVideo(video: VideoItem): Promise<HTMLVideoElement>
  /** 取消预加载 */
  cancelPreload(videoId: string | number): void
  /** 获取预加载的视频元素 */
  getPreloadedVideo(videoId: string | number): HTMLVideoElement | null
  /** 更新可见视频列表 */
  updateVisibleVideos(videos: VideoItem[]): void
  /** 更新配置 */
  updateConfig(config: Partial<PreloadConfig>): void
  /** 获取当前配置 */
  getConfig(): PreloadConfig
  /** 获取性能指标 */
  getMetrics(): PerformanceMetrics
  /** 获取实时指标 */
  getRealtimeMetrics(): RealtimeMetrics
  /** 添加事件监听器 */
  addEventListener(type: PreloadEventType, listener: PreloadEventListener): void
  /** 移除事件监听器 */
  removeEventListener(type: PreloadEventType, listener: PreloadEventListener): void
}

/**
 * Hook返回值接口
 */
export interface UseVideoPreloader {
  /** 预加载器实例 */
  preloader: VideoPreloader | null
  /** 当前配置 */
  config: PreloadConfig
  /** 性能指标 */
  metrics: PerformanceMetrics
  /** 实时指标 */
  realtimeMetrics: RealtimeMetrics
  /** 是否已初始化 */
  isInitialized: boolean
  /** 预加载指定视频 */
  preloadVideo: (video: VideoItem) => Promise<HTMLVideoElement>
  /** 获取预加载的视频 */
  getPreloadedVideo: (videoId: string | number) => HTMLVideoElement | null
  /** 更新可见视频列表 */
  updateVisibleVideos: (videos: VideoItem[]) => void
  /** 取消预加载 */
  cancelPreload: (videoId: string | number) => void
  /** 更新配置 */
  updateConfig: (config: Partial<PreloadConfig>) => void
  /** 批量预加载可见视频 */
  preloadVisibleVideos: (videos: VideoItem[]) => Promise<void>
  /** 初始激进预加载策略 */
  batchPreloadInitial: (videos: VideoItem[]) => Promise<void>
  /** 渐进式预加载剩余视频 */
  batchPreloadRemaining: (videos: VideoItem[]) => Promise<void>
  /** 内存优化 */
  optimizeMemoryUsage: () => void
  /** 获取调试信息 */
  getDebugInfo: () => any
  /** 导出性能指标 */
  exportMetrics: () => void
  /** 网络自适应配置 */
  adaptToNetworkConditions: () => void
}

// ===== 工具类型 =====

/**
 * 网络信息（基于Navigator API）
 */
export interface NetworkInformation {
  /** 连接类型 */
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  /** 下行速度（Mbps） */
  downlink?: number
  /** 往返时间（毫秒） */
  rtt?: number
  /** 是否保存数据模式 */
  saveData?: boolean
}

/**
 * 内存信息（基于Performance API）
 */
export interface MemoryInformation {
  /** 已用内存（字节） */
  usedJSHeapSize?: number
  /** 总分配内存（字节） */
  totalJSHeapSize?: number
  /** 内存限制（字节） */
  jsHeapSizeLimit?: number
}

/**
 * 可见性信息
 */
export interface VisibilityInfo {
  /** 是否在可见区域内 */
  isVisible: boolean
  /** 距离视口顶部的距离 */
  distanceFromTop: number
  /** 距离视口底部的距离 */
  distanceFromBottom: number
  /** 可见比例（0-1） */
  intersectionRatio: number
}

/**
 * 调试信息接口
 */
export interface DebugInfo {
  /** 当前队列状态 */
  queue: PreloadQueueItem[]
  /** 配置信息 */
  config: PreloadConfig
  /** 性能指标 */
  metrics: PerformanceMetrics
  /** 网络信息 */
  networkInfo: NetworkInformation
  /** 内存信息 */
  memoryInfo: MemoryInformation
  /** 近期事件日志 */
  recentEvents: PreloadEvent[]
}
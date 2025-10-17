/**
 * 视频优化和懒加载相关的TypeScript类型定义
 */

// 视频加载状态枚举
export enum VideoLoadState {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  PLAYING = 'playing',
  PAUSED = 'paused'
}

// 媒体质量级别
export enum MediaQuality {
  LOW = 'low',      // 480p, WebP缩略图
  MEDIUM = 'medium', // 720p
  HIGH = 'high',     // 1080p
  AUTO = 'auto'      // 自动根据网络和设备选择
}

// 预加载策略
export enum PreloadStrategy {
  NONE = 'none',        // 不预加载
  METADATA = 'metadata', // 只预加载视频元数据
  AUTO = 'auto'         // 预加载整个视频
}

// 视频基础信息接口
export interface VideoInfo {
  id: string | number
  title: string
  description?: string
  prompt?: string // Original prompt used for generation (for remix functionality)
  duration?: number // 秒
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
  category?: string // Content category for filtering
  tags?: string[]
  user: {
    id: string
    name: string
    avatar: string
  }
  createdAt: Date | string
  updatedAt?: Date | string
}

// 视频资源URL结构
export interface VideoUrls {
  thumbnail: {
    webp: string      // WebP格式缩略图
    jpg: string       // JPEG备用缩略图
    placeholder?: string // 模糊placeholder
  }
  video: {
    low: string       // 480p MP4
    medium: string    // 720p MP4
    high: string      // 1080p MP4
    preview?: string  // 短预览片段（hover用）
  }
  poster?: string     // 视频封面图
}

// 完整视频数据接口
export interface VideoData extends VideoInfo {
  urls: VideoUrls
  metadata: {
    fileSize: {
      low: number
      medium: number
      high: number
    }
    resolution: {
      width: number
      height: number
    }
    bitrate?: number
    codec?: string
  }
  loadState: VideoLoadState
  quality: MediaQuality
  preloadStrategy: PreloadStrategy
}

// 视频加载选项
export interface VideoLoadOptions {
  quality: MediaQuality
  preloadStrategy: PreloadStrategy
  enableHoverPreview: boolean
  hoverDelay: number // 毫秒
  maxConcurrentLoads: number
  cacheSize: number // MB
  enableOfflineCache: boolean
}

// 懒加载配置
export interface LazyLoadConfig {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  enableThumbnailPreload: boolean
  enableVideoPreload: boolean
  preloadDistance: number // 距离视口多远开始预加载
}

// 视频缓存项
export interface VideoCacheItem {
  id: string
  url: string
  blob: Blob
  quality: MediaQuality
  size: number // bytes
  lastAccessed: number
  hitCount: number
}

// 缓存统计
export interface CacheStats {
  totalSize: number // bytes
  itemCount: number
  hitRate: number
  maxSize: number
}

// 性能指标
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
  videoPlaybackStart: number
  thumbnailLoadTime: number
}

// Hook返回类型
export interface UseVideoLazyLoadReturn {
  ref: React.RefObject<HTMLElement>
  isVisible: boolean
  isLoading: boolean
  isLoaded: boolean
  error: Error | null
  loadVideo: (quality?: MediaQuality) => Promise<void>
  retryLoad: () => void
}

export interface UseHoverVideoReturn {
  isHovered: boolean
  isPlaying: boolean
  canPlay: boolean
  error: Error | null
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  videoRef: React.RefObject<HTMLVideoElement>
}

export interface UseVideoCacheReturn {
  getCachedVideo: (id: string, quality: MediaQuality) => Promise<string | null>
  cacheVideo: (id: string, url: string, quality: MediaQuality) => Promise<void>
  clearCache: () => void
  getCacheStats: () => CacheStats
}

// 设备和网络信息
export interface DeviceCapabilities {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  supportsWebP: boolean
  supportsHEVC: boolean
  screenResolution: {
    width: number
    height: number
    pixelRatio: number
  }
  memory?: number // GB
  cores?: number
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number // Mbps
  rtt: number // ms
  saveData: boolean
}

// 自适应质量选择
export interface AdaptiveQualityConfig {
  device: DeviceCapabilities
  network: NetworkInfo
  userPreference?: MediaQuality
  bandwidthThresholds: {
    low: number    // Mbps
    medium: number // Mbps
    high: number   // Mbps
  }
}

// 事件类型
export interface VideoLoadEvent {
  id: string
  quality: MediaQuality
  loadTime: number
  fromCache: boolean
}

export interface VideoErrorEvent {
  id: string
  error: Error
  quality: MediaQuality
  retryCount: number
}

export interface VideoPlayEvent {
  id: string
  trigger: 'hover' | 'click' | 'auto'
  delay: number
}

// 组件Props类型
export interface OptimizedVideoCardProps {
  video: VideoData
  loadOptions?: Partial<VideoLoadOptions>
  lazyLoadConfig?: Partial<LazyLoadConfig>
  onLoad?: (event: VideoLoadEvent) => void
  onError?: (event: VideoErrorEvent) => void
  onPlay?: (event: VideoPlayEvent) => void
  className?: string
  style?: React.CSSProperties
}

export interface VideoGalleryProps {
  videos: VideoData[]
  loadOptions?: VideoLoadOptions
  lazyLoadConfig?: LazyLoadConfig
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
}

// 全局配置
export interface VideoOptimizationConfig {
  baseUrl: string // https://static.vidfab.ai/
  cdnRegions: string[]
  fallbackUrls: string[]
  defaultLoadOptions: VideoLoadOptions
  defaultLazyLoadConfig: LazyLoadConfig
  analytics: {
    enabled: boolean
    trackLoadTimes: boolean
    trackErrors: boolean
    trackPlayback: boolean
  }
}
# 视频懒加载和资源优化策略指南

## 概览

本文档详细说明了针对大型视频画廊（75+项目）的全面性能优化策略，包括懒加载、缓存、自适应质量选择等关键技术。

## 核心特性

### 1. 智能懒加载
- **Intersection Observer API**: 监控视口内元素，实现精确的懒加载触发
- **渐进式加载**: 缩略图 → 视频元数据 → 完整视频的分层加载策略
- **预加载距离控制**: 根据用户滚动行为智能调整预加载距离

### 2. 悬停播放优化
- **200ms 延迟触发**: 避免意外触发，提升用户体验
- **并发控制**: 限制同时播放的视频数量，防止资源过载
- **智能预加载**: 基于网络状况和设备性能自动调整策略

### 3. 多层缓存系统
- **内存缓存**: 快速访问已加载的视频资源
- **IndexedDB 持久化**: 跨会话保存大型视频文件
- **LRU 淘汰策略**: 智能管理缓存空间

### 4. 自适应质量选择
- **网络感知**: 根据连接速度自动选择最佳视频质量
- **设备性能检测**: 考虑设备内存和CPU能力
- **用户偏好保存**: 记住用户的质量偏好设置

## 技术实现

### 核心组件结构

```
types/
├── video-optimization.ts     # 类型定义和接口

hooks/
├── useVideoLazyLoad.ts      # 基础懒加载Hook
├── useIntersectionObserver.ts # 高级观察器Hook
├── useHoverVideo.ts         # 悬停播放Hook
└── useVideoCache.ts         # 缓存管理Hook

components/optimized/
├── OptimizedVideoCard.tsx   # 优化的视频卡片
└── OptimizedVideoGallery.tsx # 优化的视频画廊
```

### 关键Hook使用示例

#### 1. useVideoLazyLoad
```typescript
const {
  ref,
  isVisible,
  isLoading,
  isLoaded,
  error,
  loadVideo,
  retryLoad
} = useVideoLazyLoad({
  id: 'video-123',
  thumbnailUrl: 'https://static.vidfab.ai/thumbnails/123.webp',
  videoUrl: 'https://static.vidfab.ai/videos/123_720p.mp4',
  config: {
    rootMargin: '100px',
    enableThumbnailPreload: true
  }
})
```

#### 2. useHoverVideo
```typescript
const {
  isHovered,
  isPlaying,
  canPlay,
  handleMouseEnter,
  handleMouseLeave,
  videoRef
} = useHoverVideo({
  id: 'video-123',
  previewUrl: 'https://static.vidfab.ai/previews/123.mp4',
  fullVideoUrl: 'https://static.vidfab.ai/videos/123_720p.mp4',
  hoverDelay: 200,
  enabled: true
})
```

#### 3. useVideoCache
```typescript
const {
  getCachedVideo,
  cacheVideo,
  clearCache,
  getCacheStats
} = useVideoCache({
  maxSize: 100, // 100MB
  maxItems: 50,
  ttl: 24 * 60 * 60 * 1000 // 24小时
})
```

## 性能优化策略

### 1. 网络优化

#### CDN 配置
```typescript
const CDN_CONFIG = {
  baseUrl: 'https://static.vidfab.ai/',
  regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  fallbackUrls: [
    'https://backup-cdn.vidfab.ai/',
    'https://s3.amazonaws.com/vidfab-assets/'
  ]
}
```

#### 视频格式和质量
```typescript
const VIDEO_QUALITIES = {
  low: {
    resolution: '480p',
    bitrate: '1000kbps',
    size: '~3MB/min'
  },
  medium: {
    resolution: '720p',
    bitrate: '2500kbps',
    size: '~8MB/min'
  },
  high: {
    resolution: '1080p',
    bitrate: '5000kbps',
    size: '~18MB/min'
  }
}
```

### 2. 内存管理

#### 内存使用监控
```typescript
// 监控内存使用情况
const getMemoryUsage = (): MemoryInfo => {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return {
    usedJSSize: 0,
    totalJSSize: 0,
    jsHeapSizeLimit: 0
  }
}
```

#### 自动清理策略
```typescript
const AUTO_CLEANUP_CONFIG = {
  memoryThreshold: 0.8, // 80%内存使用率时触发清理
  cleanupInterval: 5 * 60 * 1000, // 5分钟检查一次
  forceCleanupSize: 50 * 1024 * 1024 // 50MB强制清理阈值
}
```

### 3. 用户体验优化

#### 渐进式加载状态
```typescript
enum LoadState {
  IDLE = 'idle',        // 初始状态
  LOADING = 'loading',  // 加载中
  LOADED = 'loaded',    // 加载完成
  ERROR = 'error',      // 加载失败
  PLAYING = 'playing'   // 播放中
}
```

#### 错误处理和重试
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  backoffMultiplier: 2,
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'AbortError'
  ]
}
```

## 最佳实践建议

### 1. 移动端优化

#### 触摸设备适配
- 禁用移动端的悬停播放（hover事件不可靠）
- 使用点击播放替代悬停播放
- 实现滑动加载更多功能

#### 网络感知
```typescript
// 检测网络状况
const getNetworkInfo = (): NetworkInfo => {
  const connection = (navigator as any).connection
  if (!connection) return { effectiveType: 'unknown', downlink: 0, rtt: 0, saveData: false }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  }
}
```

### 2. 桌面端优化

#### 键盘导航支持
```typescript
const handleKeyNavigation = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowDown':
      // 上下键导航
      break
    case 'Enter':
    case ' ':
      // 播放/暂停
      break
    case 'Escape':
      // 退出全屏
      break
  }
}
```

#### 多显示器支持
- 检测屏幕分辨率和像素密度
- 根据显示器规格调整视频质量

### 3. 缓存策略

#### 智能预加载
```typescript
const PRELOAD_STRATEGIES = {
  aggressive: {
    // 高带宽、高性能设备
    preloadDistance: 500,
    maxConcurrent: 5,
    enableVideoPreload: true
  },
  conservative: {
    // 低带宽、低性能设备
    preloadDistance: 100,
    maxConcurrent: 1,
    enableVideoPreload: false
  },
  balanced: {
    // 平衡模式
    preloadDistance: 200,
    maxConcurrent: 3,
    enableVideoPreload: true
  }
}
```

#### 缓存优先级
```typescript
enum CachePriority {
  HIGH = 3,    // 当前视口内的视频
  MEDIUM = 2,  // 即将进入视口的视频
  LOW = 1      // 用户可能感兴趣的视频
}
```

## 性能监控和分析

### 1. 关键指标

#### 加载性能
- **首屏加载时间 (FCP)**: < 1.5秒
- **缩略图加载时间**: < 500ms
- **视频首帧时间**: < 2秒
- **交互响应时间**: < 100ms

#### 内存和网络
- **内存使用率**: < 80%
- **缓存命中率**: > 85%
- **网络请求数**: 尽量最小化
- **数据传输量**: 根据网络状况优化

### 2. 监控实现

```typescript
// 性能监控
const trackPerformanceMetrics = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure') {
        analytics.track('performance', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        })
      }
    }
  })

  observer.observe({ entryTypes: ['measure', 'navigation'] })
}
```

### 3. A/B 测试建议

#### 测试变量
- 悬停延迟时间（100ms vs 200ms vs 300ms）
- 预加载距离（50px vs 100px vs 200px）
- 缓存大小（50MB vs 100MB vs 200MB）
- 视频质量默认设置（medium vs auto）

## 部署和配置

### 1. 环境配置

#### 开发环境
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['static.vidfab.ai'],
    formats: ['image/webp', 'image/jpeg']
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true
  }
}
```

#### 生产环境优化
```typescript
const PRODUCTION_CONFIG = {
  enableCompression: true,
  enableServiceWorker: true,
  cacheStrategy: 'stale-while-revalidate',
  maxAge: 31536000, // 1年
  enablePreload: true
}
```

### 2. 服务端配置

#### CDN 设置
```nginx
# Nginx 配置示例
location ~* \.(mp4|webm|ogg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header Access-Control-Allow-Origin "*";

  # 启用范围请求支持
  add_header Accept-Ranges bytes;

  # 启用压缩
  gzip on;
  gzip_types video/mp4;
}
```

## 故障排除

### 常见问题

1. **视频加载缓慢**
   - 检查网络连接质量
   - 验证CDN配置
   - 调整视频质量设置

2. **内存使用过高**
   - 清理未使用的缓存
   - 减少同时加载的视频数量
   - 启用自动清理机制

3. **播放卡顿**
   - 检查视频编码格式
   - 验证设备性能
   - 调整缓冲策略

### 调试工具

```typescript
// 开发环境调试
if (process.env.NODE_ENV === 'development') {
  window.videoDebug = {
    getCacheStats,
    clearCache,
    getNetworkInfo,
    getMemoryUsage,
    forceCleanup
  }
}
```

## 未来优化方向

1. **WebAssembly 视频处理**: 客户端视频压缩和转码
2. **WebRTC 支持**: 实时视频流传输
3. **AI 驱动的预加载**: 基于用户行为预测的智能预加载
4. **边缘计算**: 在边缘节点进行视频处理和缓存
5. **WebCodecs API**: 现代浏览器的硬件加速视频解码

---

通过实施这些优化策略，你的视频画廊将能够：
- 支持75+视频的流畅展示
- 提供优秀的移动端和桌面端体验
- 智能管理网络和内存资源
- 自适应不同的设备和网络环境
- 实现高性能的用户交互体验
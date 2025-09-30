/**
 * 图片缓存管理器 - 性能优化
 * 包括预览缓存、上传队列管理、失败重试等功能
 */

export interface CacheItem {
  url: string
  blob: Blob
  timestamp: number
  size: number
}

export interface UploadQueueItem {
  id: string
  file: File
  options: any
  retries: number
  maxRetries: number
  onProgress?: (progress: number) => void
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

export class ImageCacheManager {
  private cache = new Map<string, CacheItem>()
  private maxCacheSize = 50 * 1024 * 1024 // 50MB
  private maxCacheItems = 100
  private currentCacheSize = 0

  /**
   * 添加到缓存
   */
  set(key: string, blob: Blob): void {
    // 检查缓存大小限制
    if (this.currentCacheSize + blob.size > this.maxCacheSize) {
      this.evictLRU()
    }

    // 如果缓存项数量超限，删除最旧的
    if (this.cache.size >= this.maxCacheItems) {
      this.evictLRU()
    }

    const url = URL.createObjectURL(blob)
    const item: CacheItem = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size
    }

    // 如果key已存在，先清理旧的URL
    const existing = this.cache.get(key)
    if (existing) {
      URL.revokeObjectURL(existing.url)
      this.currentCacheSize -= existing.size
    }

    this.cache.set(key, item)
    this.currentCacheSize += blob.size
  }

  /**
   * 从缓存获取
   */
  get(key: string): string | null {
    const item = this.cache.get(key)
    if (item) {
      // 更新时间戳
      item.timestamp = Date.now()
      return item.url
    }
    return null
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    const item = this.cache.get(key)
    if (item) {
      URL.revokeObjectURL(item.url)
      this.currentCacheSize -= item.size
      this.cache.delete(key)
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    for (const item of this.cache.values()) {
      URL.revokeObjectURL(item.url)
    }
    this.cache.clear()
    this.currentCacheSize = 0
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      items: this.cache.size,
      size: this.currentCacheSize,
      sizeMB: Math.round(this.currentCacheSize / (1024 * 1024) * 100) / 100,
      maxSize: this.maxCacheSize,
      maxSizeMB: Math.round(this.maxCacheSize / (1024 * 1024)),
      maxItems: this.maxCacheItems
    }
  }
}

export class UploadQueueManager {
  private queue: UploadQueueItem[] = []
  private processing = false
  private maxConcurrent = 2 // 最大并发上传数
  private currentUploads = 0

  /**
   * 添加到上传队列
   */
  addToQueue(item: Omit<UploadQueueItem, 'id' | 'retries'>): string {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const queueItem: UploadQueueItem = {
      id,
      retries: 0,
      ...item
    }

    this.queue.push(queueItem)

    // 开始处理队列
    if (!this.processing) {
      this.processQueue()
    }

    return id
  }

  /**
   * 处理上传队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0 && this.currentUploads < this.maxConcurrent) {
      const item = this.queue.shift()
      if (item) {
        this.processUpload(item)
      }
    }

    // 如果没有正在进行的上传，停止处理
    if (this.currentUploads === 0) {
      this.processing = false
    }
  }

  /**
   * 处理单个上传
   */
  private async processUpload(item: UploadQueueItem): Promise<void> {
    this.currentUploads++

    try {
      // 这里应该调用实际的上传逻辑
      // 为了演示，我们使用setTimeout模拟上传过程
      const result = await this.simulateUpload(item)

      item.onSuccess?.(result)
    } catch (error) {
      console.error(`上传失败 (${item.retries + 1}/${item.maxRetries}):`, error)

      item.retries++

      if (item.retries < item.maxRetries) {
        // 重新加入队列，使用指数退避策略
        const delay = Math.min(1000 * Math.pow(2, item.retries), 10000)
        setTimeout(() => {
          this.queue.unshift(item) // 重新加入队列头部
          this.processQueue()
        }, delay)
      } else {
        item.onError?.(error instanceof Error ? error : new Error('上传失败'))
      }
    } finally {
      this.currentUploads--

      // 继续处理队列
      setTimeout(() => this.processQueue(), 100)
    }
  }

  /**
   * 模拟上传过程（实际项目中应该替换为真实的上传逻辑）
   */
  private async simulateUpload(item: UploadQueueItem): Promise<any> {
    return new Promise((resolve, reject) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        item.onProgress?.(Math.min(progress, 100))

        if (progress >= 100) {
          clearInterval(interval)

          // 模拟成功/失败
          if (Math.random() > 0.1) { // 90% 成功率
            resolve({
              id: item.id,
              url: `https://example.com/uploads/${item.file.name}`,
              size: item.file.size
            })
          } else {
            reject(new Error('模拟上传失败'))
          }
        }
      }, 100)
    })
  }

  /**
   * 取消上传
   */
  cancelUpload(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queued: this.queue.length,
      processing: this.currentUploads,
      total: this.queue.length + this.currentUploads
    }
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = []
  }
}

// 全局实例
export const globalImageCache = new ImageCacheManager()
export const globalUploadQueue = new UploadQueueManager()

// 图片预加载工具
export class ImagePreloader {
  private loadingImages = new Set<string>()
  private cache = globalImageCache

  /**
   * 预加载图片
   */
  async preloadImage(url: string): Promise<void> {
    if (this.loadingImages.has(url) || this.cache.get(url)) {
      return
    }

    this.loadingImages.add(url)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      this.cache.set(url, blob)
    } catch (error) {
      console.error('预加载图片失败:', url, error)
      throw error
    } finally {
      this.loadingImages.delete(url)
    }
  }

  /**
   * 批量预加载
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadImage(url))
    await Promise.allSettled(promises)
  }

  /**
   * 检查是否正在加载
   */
  isLoading(url: string): boolean {
    return this.loadingImages.has(url)
  }
}

export const globalImagePreloader = new ImagePreloader()

// 工具函数
export const ImageCacheUtils = {
  /**
   * 生成缓存key
   */
  generateCacheKey(file: File, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : ''
    return `${file.name}_${file.size}_${file.lastModified}_${optionsStr}`
  },

  /**
   * 检查浏览器存储容量
   */
  async checkStorageQuota(): Promise<{ available: number; used: number; total: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        available: (estimate.quota || 0) - (estimate.usage || 0),
        used: estimate.usage || 0,
        total: estimate.quota || 0
      }
    }
    return { available: 0, used: 0, total: 0 }
  },

  /**
   * 内存使用监控
   */
  getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory
    }
    return null
  },

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(cache: ImageCacheManager, maxAge: number = 3600000): void {
    const now = Date.now()
    const entries = Array.from((cache as any).cache.entries())

    for (const [key, item] of entries) {
      if (now - item.timestamp > maxAge) {
        cache.delete(key)
      }
    }
  }
}
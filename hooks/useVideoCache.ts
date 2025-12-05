"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  UseVideoCacheReturn,
  VideoCacheItem,
  CacheStats,
  MediaQuality
} from '@/types/video-optimization'

// 缓存配置
interface VideoCacheConfig {
  maxSize: number // MB
  maxItems: number
  ttl: number // 毫秒
  enableCompression: boolean
  enableIndexedDB: boolean
  enableServiceWorker: boolean
}

const DEFAULT_CACHE_CONFIG: VideoCacheConfig = {
  maxSize: 100, // 100MB
  maxItems: 50,
  ttl: 24 * 60 * 60 * 1000, // 24小时
  enableCompression: false,
  enableIndexedDB: true,
  enableServiceWorker: false
}

// 内存缓存管理器
class MemoryCache {
  private cache = new Map<string, VideoCacheItem>()
  private totalSize = 0
  private config: VideoCacheConfig

  constructor(config: VideoCacheConfig) {
    this.config = config
  }

  private generateKey(id: string, quality: MediaQuality): string {
    return `${id}_${quality}`
  }

  private evictOldestItems(requiredSpace: number): void {
    const items = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed)

    let freedSpace = 0
    for (const item of items) {
      if (freedSpace >= requiredSpace) break

      this.cache.delete(this.generateKey(item.id, item.quality))
      this.totalSize -= item.size
      freedSpace += item.size
    }
  }

  async set(id: string, quality: MediaQuality, blob: Blob): Promise<void> {
    const key = this.generateKey(id, quality)
    const size = blob.size

    // 检查是否超过单个文件大小限制
    const maxFileSize = this.config.maxSize * 1024 * 1024 * 0.2 // 20% of total cache
    if (size > maxFileSize) {
      throw new Error('文件过大，无法缓存')
    }

    // 检查总容量
    const requiredSpace = size
    const availableSpace = (this.config.maxSize * 1024 * 1024) - this.totalSize

    if (requiredSpace > availableSpace) {
      this.evictOldestItems(requiredSpace - availableSpace)
    }

    // 添加到缓存
    const cacheItem: VideoCacheItem = {
      id,
      url: URL.createObjectURL(blob),
      blob,
      quality,
      size,
      lastAccessed: Date.now(),
      hitCount: 0
    }

    this.cache.set(key, cacheItem)
    this.totalSize += size
  }

  async get(id: string, quality: MediaQuality): Promise<string | null> {
    const key = this.generateKey(id, quality)
    const item = this.cache.get(key)

    if (!item) return null

    // 检查是否过期
    if (Date.now() - item.lastAccessed > this.config.ttl) {
      this.cache.delete(key)
      this.totalSize -= item.size
      URL.revokeObjectURL(item.url)
      return null
    }

    // 更新访问信息
    item.lastAccessed = Date.now()
    item.hitCount++

    return item.url
  }

  has(id: string, quality: MediaQuality): boolean {
    const key = this.generateKey(id, quality)
    return this.cache.has(key)
  }

  delete(id: string, quality: MediaQuality): boolean {
    const key = this.generateKey(id, quality)
    const item = this.cache.get(key)

    if (item) {
      URL.revokeObjectURL(item.url)
      this.totalSize -= item.size
      return this.cache.delete(key)
    }

    return false
  }

  clear(): void {
    this.cache.forEach(item => {
      URL.revokeObjectURL(item.url)
    })
    this.cache.clear()
    this.totalSize = 0
  }

  getStats(): CacheStats {
    const totalHits = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.hitCount, 0)
    const totalRequests = totalHits + this.cache.size // 简化计算

    return {
      totalSize: this.totalSize,
      itemCount: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      maxSize: this.config.maxSize * 1024 * 1024
    }
  }
}

// IndexedDB 持久化缓存
class IndexedDBCache {
  private dbName = 'vidfab_video_cache'
  private storeName = 'videos'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
        }
      }
    })
  }

  async set(key: string, data: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.put({
        key,
        data,
        lastAccessed: Date.now()
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get(key: string): Promise<any | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // 更新最后访问时间
          this.set(key, result.data)
          resolve(result.data)
        } else {
          resolve(null)
        }
      }
    })
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

// 主缓存Hook
export function useVideoCache(config: Partial<VideoCacheConfig> = {}): UseVideoCacheReturn {
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config }
  const memoryCache = useRef<MemoryCache>()
  const indexedDBCache = useRef<IndexedDBCache>()
  const [stats, setStats] = useState<CacheStats>({
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    maxSize: finalConfig.maxSize * 1024 * 1024
  })

  // 初始化缓存
  useEffect(() => {
    memoryCache.current = new MemoryCache(finalConfig)

    if (finalConfig.enableIndexedDB) {
      indexedDBCache.current = new IndexedDBCache()
    }
  }, [finalConfig])

  // 获取缓存的视频
  const getCachedVideo = useCallback(async (
    id: string,
    quality: MediaQuality
  ): Promise<string | null> => {
    if (!memoryCache.current) return null

    // 先尝试内存缓存
    const memoryResult = await memoryCache.current.get(id, quality)
    if (memoryResult) {
      setStats(memoryCache.current.getStats())
      return memoryResult
    }

    // 再尝试IndexedDB缓存
    if (indexedDBCache.current) {
      const key = `${id}_${quality}`
      const dbResult = await indexedDBCache.current.get(key)

      if (dbResult) {
        // 🔥 修复：直接使用存储的Blob，而不是fetch Blob URL
        const blob = dbResult.blob
        if (blob) {
          // 将数据重新加载到内存缓存
          await memoryCache.current.set(id, quality, blob)
          setStats(memoryCache.current.getStats())
          return memoryCache.current.get(id, quality)
        }
      }
    }

    return null
  }, [])

  // 缓存视频
  const cacheVideo = useCallback(async (
    id: string,
    url: string,
    quality: MediaQuality
  ): Promise<void> => {
    if (!memoryCache.current) return

    try {
      // 下载视频
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`)
      }

      const blob = await response.blob()

      // 存储到内存缓存
      await memoryCache.current.set(id, quality, blob)

      // 可选：存储到IndexedDB
      // 🔥 修复：直接存储 Blob，而不是 Blob URL，避免内存泄露
      if (indexedDBCache.current) {
        const key = `${id}_${quality}`
        await indexedDBCache.current.set(key, { blob })
      }

      setStats(memoryCache.current.getStats())
    } catch (error) {
      console.error('缓存视频失败:', error)
      throw error
    }
  }, [])

  // 清除缓存
  const clearCache = useCallback(() => {
    memoryCache.current?.clear()
    indexedDBCache.current?.clear()
    setStats({
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      maxSize: finalConfig.maxSize * 1024 * 1024
    })
  }, [finalConfig.maxSize])

  // 获取缓存统计
  const getCacheStats = useCallback((): CacheStats => {
    return memoryCache.current?.getStats() || stats
  }, [stats])

  // 定期更新统计信息
  useEffect(() => {
    const interval = setInterval(() => {
      if (memoryCache.current) {
        setStats(memoryCache.current.getStats())
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    getCachedVideo,
    cacheVideo,
    clearCache,
    getCacheStats
  }
}

// 预加载管理Hook
export function useVideoPreloader() {
  const { cacheVideo, getCachedVideo } = useVideoCache()
  const [preloadQueue, setPreloadQueue] = useState<Array<{
    id: string
    url: string
    quality: MediaQuality
    priority: number
  }>>([])
  const [isPreloading, setIsPreloading] = useState(false)

  const addToPreloadQueue = useCallback((
    id: string,
    url: string,
    quality: MediaQuality,
    priority: number = 1
  ) => {
    setPreloadQueue(prev => {
      const exists = prev.find(item => item.id === id && item.quality === quality)
      if (exists) return prev

      const newItem = { id, url, quality, priority }
      return [...prev, newItem].sort((a, b) => b.priority - a.priority)
    })
  }, [])

  const processPreloadQueue = useCallback(async () => {
    if (isPreloading || preloadQueue.length === 0) return

    setIsPreloading(true)

    try {
      const item = preloadQueue[0]

      // 检查是否已经缓存
      const cached = await getCachedVideo(item.id, item.quality)
      if (!cached) {
        await cacheVideo(item.id, item.url, item.quality)
      }

      setPreloadQueue(prev => prev.slice(1))
    } catch (error) {
      console.error('预加载失败:', error)
      setPreloadQueue(prev => prev.slice(1))
    } finally {
      setIsPreloading(false)
    }
  }, [isPreloading, preloadQueue, cacheVideo, getCachedVideo])

  useEffect(() => {
    processPreloadQueue()
  }, [processPreloadQueue])

  return {
    addToPreloadQueue,
    queueLength: preloadQueue.length,
    isPreloading
  }
}
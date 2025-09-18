"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import type { VideoHeroItem, VideoPoolItem } from '../types/video-hero.types'
import { VIDEO_HERO_CONFIG, PRELOAD_PHASES } from '../config/video-hero.config'

export const useVideoPool = (items: VideoHeroItem[], shouldPreload: boolean) => {
  const [videoPool, setVideoPool] = useState<Map<string, VideoPoolItem>>(new Map())
  const [loadingCount, setLoadingCount] = useState(0)
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const createVideoElement = useCallback((item: VideoHeroItem): HTMLVideoElement => {
    const video = document.createElement('video')
    
    video.src = item.videoUrl
    video.poster = item.posterUrl
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.loop = false
    video.style.display = 'none'
    
    return video
  }, [])

  const preDecodeVideo = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    try {
      video.currentTime = 0.1
      await video.play()
      video.pause()
      video.currentTime = 0
      return true
    } catch (error) {
      console.warn('Pre-decode failed:', error)
      return false
    }
  }, [])

  const loadVideo = useCallback(async (item: VideoHeroItem, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (videoPool.has(item.id)) {
      console.log('🔄 Video already in pool:', item.id)
      return
    }

    console.log('📼 Loading video:', item.id, 'Priority:', priority)
    console.log('🔗 Video URL:', item.videoUrl)

    const videoElement = createVideoElement(item)
    document.body.appendChild(videoElement)

    const poolItem: VideoPoolItem = {
      id: item.id,
      videoElement,
      loadState: 'loading',
      isPreDecoded: false,
      lastUsed: Date.now()
    }

    setVideoPool(prev => new Map(prev.set(item.id, poolItem)))
    setLoadingCount(prev => prev + 1)

    const handleCanPlay = async () => {
      console.log('✅ Video can play:', item.id)
      poolItem.loadState = 'canplay'
      
      if (priority === 'high') {
        console.log('🎯 Pre-decoding high priority video:', item.id)
        poolItem.isPreDecoded = await preDecodeVideo(videoElement)
        console.log('🎯 Pre-decode result:', poolItem.isPreDecoded)
      }
      
      poolItem.lastUsed = Date.now()
      setVideoPool(prev => new Map(prev.set(item.id, poolItem)))
      setLoadingCount(prev => prev - 1)
    }

    const handleError = (e: Event) => {
      console.error('❌ Video load error:', item.id, e)
      poolItem.loadState = 'error'
      setVideoPool(prev => new Map(prev.set(item.id, poolItem)))
      setLoadingCount(prev => prev - 1)
    }

    const handleLoadStart = () => {
      console.log('🚀 Video load started:', item.id)
    }

    const handleLoadedMetadata = () => {
      console.log('📊 Video metadata loaded:', item.id)
    }

    const timeout = setTimeout(() => {
      console.log('⏰ Video load timeout:', item.id)
      handleError(new Event('timeout'))
      timeoutsRef.current.delete(item.id)
    }, VIDEO_HERO_CONFIG.videoLoadTimeout)

    timeoutsRef.current.set(item.id, timeout)

    videoElement.addEventListener('canplay', handleCanPlay, { once: true })
    videoElement.addEventListener('error', handleError, { once: true })
    videoElement.addEventListener('loadstart', handleLoadStart, { once: true })
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
  }, [videoPool, createVideoElement, preDecodeVideo])

  const getVideo = useCallback((itemId: string): HTMLVideoElement | null => {
    const poolItem = videoPool.get(itemId)
    if (poolItem && poolItem.loadState === 'canplay') {
      poolItem.lastUsed = Date.now()
      return poolItem.videoElement
    }
    return null
  }, [videoPool])

  const isVideoReady = useCallback((itemId: string): boolean => {
    const poolItem = videoPool.get(itemId)
    return !!(poolItem && poolItem.loadState === 'canplay')
  }, [videoPool])

  const preloadAll = useCallback(() => {
    if (!shouldPreload) return

    const loadWithPhases = async () => {
      // Phase 1: Load first video immediately (high priority)
      if (items[0]) {
        await loadVideo(items[0], 'high')
      }

      // Phase 2: Load adjacent videos after delay
      setTimeout(() => {
        if (items[1]) loadVideo(items[1], 'medium')
        if (items[items.length - 1] && items.length > 2) {
          loadVideo(items[items.length - 1], 'medium')
        }
      }, PRELOAD_PHASES.PHASE_2.delay)

      // Phase 3: Load remaining videos
      setTimeout(() => {
        items.slice(2, -1).forEach(item => {
          loadVideo(item, 'low')
        })
      }, PRELOAD_PHASES.PHASE_3.delay)
    }

    loadWithPhases()
  }, [items, shouldPreload, loadVideo])

  const cleanupOldVideos = useCallback(() => {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    videoPool.forEach((poolItem, id) => {
      if (now - poolItem.lastUsed > maxAge) {
        if (poolItem.videoElement) {
          poolItem.videoElement.remove()
        }
        videoPool.delete(id)
      }
    })

    setVideoPool(new Map(videoPool))
  }, [videoPool])

  useEffect(() => {
    preloadAll()

    const cleanupInterval = setInterval(cleanupOldVideos, 2 * 60 * 1000) // Every 2 minutes

    return () => {
      clearInterval(cleanupInterval)
      
      // Cleanup all timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current.clear()

      // Cleanup all video elements
      videoPool.forEach(poolItem => {
        if (poolItem.videoElement) {
          poolItem.videoElement.remove()
        }
      })
    }
  }, [preloadAll, cleanupOldVideos])

  return {
    getVideo,
    isVideoReady,
    loadVideo,
    videoPool,
    loadingCount,
    isPoolReady: videoPool.size > 0
  }
}
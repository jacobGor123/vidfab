"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import type { VideoHeroItem, VideoHeroState, VideoCarouselControls } from '../types/video-hero.types'
import { VIDEO_HERO_CONFIG } from '../config/video-hero.config'

interface UseVideoCarouselOptions {
  items: VideoHeroItem[]
  onIndexChange?: (index: number) => void
  autoPlay?: boolean
}

export const useVideoCarousel = ({ 
  items, 
  onIndexChange,
  autoPlay = true 
}: UseVideoCarouselOptions) => {
  const [state, setState] = useState<VideoHeroState>({
    currentIndex: 0,
    isAutoPlaying: autoPlay,
    isTransitioning: false,
    loadedVideos: new Set(),
    isMobile: false,
    isPaused: false
  })

  const autoPlayTimeoutRef = useRef<NodeJS.Timeout>()
  const resumeTimeoutRef = useRef<NodeJS.Timeout>()
  const currentVideoRef = useRef<HTMLVideoElement>()

  const clearTimeouts = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current)
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }
  }, [])

  const goToIndex = useCallback((index: number) => {
    if (index === state.currentIndex || index < 0 || index >= items.length) {
      return
    }

    clearTimeouts()

    setState(prev => ({
      ...prev,
      currentIndex: index,
      isTransitioning: true,
      // 立即恢复自动播放状态，而不是等25秒
      isAutoPlaying: items.length > 1
    }))

    // 短暂延迟后清除过渡状态
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isTransitioning: false
      }))
    }, 1000) // 1秒后清除过渡状态

    onIndexChange?.(index)
  }, [state.currentIndex, items.length, clearTimeouts, onIndexChange])

  const goToNext = useCallback(() => {
    const nextIndex = (state.currentIndex + 1) % items.length
    goToIndex(nextIndex)
  }, [state.currentIndex, items.length, goToIndex])

  const goToPrevious = useCallback(() => {
    const prevIndex = (state.currentIndex - 1 + items.length) % items.length
    goToIndex(prevIndex)
  }, [state.currentIndex, items.length, goToIndex])

  const pauseAutoPlay = useCallback(() => {
    clearTimeouts()
    setState(prev => ({ ...prev, isAutoPlaying: false, isPaused: true }))
  }, [clearTimeouts])

  const resumeAutoPlay = useCallback(() => {
    setState(prev => ({ ...prev, isAutoPlaying: true, isPaused: false }))
  }, [])

  const toggleAutoPlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAutoPlaying: !prev.isAutoPlaying,
      isPaused: !prev.isAutoPlaying
    }))
  }, [])

  const handleVideoEnd = useCallback(() => {
    if (state.isAutoPlaying && !state.isPaused) {
      goToNext()
    }
  }, [state.isAutoPlaying, state.isPaused, goToNext])

  const markVideoLoaded = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      loadedVideos: new Set(prev.loadedVideos.add(itemId))
    }))
  }, [])

  const setCurrentVideoRef = useCallback((video: HTMLVideoElement | null) => {
    if (currentVideoRef.current) {
      currentVideoRef.current.removeEventListener('ended', handleVideoEnd)
    }

    if (video) {
      currentVideoRef.current = video
      video.addEventListener('ended', handleVideoEnd)
    }
  }, [handleVideoEnd])

  const getCurrentItem = useCallback(() => {
    return items[state.currentIndex] || null
  }, [items, state.currentIndex])

  const getAdjacentItems = useCallback(() => {
    const total = items.length
    const current = state.currentIndex
    
    return {
      previous: items[(current - 1 + total) % total],
      next: items[(current + 1) % total]
    }
  }, [items, state.currentIndex])

  useEffect(() => {
    return () => {
      clearTimeouts()
      if (currentVideoRef.current) {
        currentVideoRef.current.removeEventListener('ended', handleVideoEnd)
      }
    }
  }, [clearTimeouts, handleVideoEnd])

  const controls: VideoCarouselControls = {
    goToIndex,
    goToNext,
    goToPrevious,
    pauseAutoPlay,
    resumeAutoPlay,
    toggleAutoPlay
  }

  return {
    state,
    controls,
    getCurrentItem,
    getAdjacentItems,
    setCurrentVideoRef,
    markVideoLoaded,
    currentItem: getCurrentItem()
  }
}
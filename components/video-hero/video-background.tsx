"use client"

import type React from "react"
import { useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { VideoHeroItem } from './types/video-hero.types'
import { VIDEO_HERO_CONFIG } from './config/video-hero.config'

interface VideoBackgroundProps {
  items: VideoHeroItem[]
  currentIndex: number
  getVideo: (itemId: string) => HTMLVideoElement | null
  isVideoReady: (itemId: string) => boolean
  onVideoEnd?: () => void
  onVideoCanPlay?: (itemId: string) => void
  className?: string
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  items,
  currentIndex,
  getVideo,
  isVideoReady,
  onVideoEnd,
  onVideoCanPlay,
  className = ""
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentVideoRef = useRef<HTMLVideoElement | null>(null)
  const nextVideoRef = useRef<HTMLVideoElement | null>(null)
  const isTransitioningRef = useRef(false)

  const currentItem = items[currentIndex]

  const playVideo = useCallback(async (video: HTMLVideoElement) => {
    try {
      video.currentTime = 0
      await video.play()
      return true
    } catch (error) {
      console.warn('Video play failed:', error)
      return false
    }
  }, [])

  const pauseVideo = useCallback((video: HTMLVideoElement) => {
    try {
      video.pause()
    } catch (error) {
      console.warn('Video pause failed:', error)
    }
  }, [])

  const handleVideoEnd = useCallback(() => {
    onVideoEnd?.()
  }, [onVideoEnd])

  const switchToVideo = useCallback(async (itemId: string) => {
    
    if (isTransitioningRef.current) {
      return
    }
    
    const newVideo = getVideo(itemId)
    
    if (!newVideo || !isVideoReady(itemId)) {
      return
    }

    isTransitioningRef.current = true

    // Pause current video
    if (currentVideoRef.current) {
      pauseVideo(currentVideoRef.current)
      currentVideoRef.current.style.opacity = '0'
    }

    // Setup new video
    newVideo.style.position = 'absolute'
    newVideo.style.top = '0'
    newVideo.style.left = '0'
    newVideo.style.width = '100%'
    newVideo.style.height = '100%'
    newVideo.style.objectFit = 'cover'
    newVideo.style.opacity = '0'
    newVideo.style.transition = `opacity ${VIDEO_HERO_CONFIG.transitionDuration}ms ease-out`
    newVideo.style.zIndex = '1'

    // Add to container
    if (containerRef.current) {
      containerRef.current.appendChild(newVideo)
    }

    // Start playing and fade in
    const playSuccess = await playVideo(newVideo)
    
    if (playSuccess) {
      // Fade in new video
      requestAnimationFrame(() => {
        newVideo.style.opacity = '1'
      })

      // Clean up old video after transition
      setTimeout(() => {
        if (currentVideoRef.current && currentVideoRef.current.parentNode) {
          currentVideoRef.current.remove()
        }
        currentVideoRef.current = newVideo
        isTransitioningRef.current = false
      }, VIDEO_HERO_CONFIG.transitionDuration)

      // Setup event listeners
      newVideo.addEventListener('ended', handleVideoEnd, { once: true })
      
      onVideoCanPlay?.(itemId)
    } else {
      // Fallback: show poster
      isTransitioningRef.current = false
    }
  }, [getVideo, isVideoReady, playVideo, pauseVideo, handleVideoEnd, onVideoCanPlay])

  // Handle index changes
  useEffect(() => {
    if (currentItem) {
      switchToVideo(currentItem.id)
    }
  }, [currentIndex, currentItem, switchToVideo])

  // Initialize first video
  useEffect(() => {
    if (items.length > 0 && currentIndex === 0) {
      const firstItem = items[0]
      const video = getVideo(firstItem.id)
      
      if (video && isVideoReady(firstItem.id)) {
        video.style.position = 'absolute'
        video.style.top = '0'
        video.style.left = '0'
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'cover'
        video.style.opacity = '1'

        if (containerRef.current) {
          containerRef.current.appendChild(video)
        }

        currentVideoRef.current = video
        playVideo(video)
        
        video.addEventListener('ended', handleVideoEnd)
        onVideoCanPlay?.(firstItem.id)
      }
    }
  }, [items, getVideo, isVideoReady, playVideo, handleVideoEnd, onVideoCanPlay])

  // Cleanup
  useEffect(() => {
    return () => {
      if (currentVideoRef.current) {
        currentVideoRef.current.removeEventListener('ended', handleVideoEnd)
      }
    }
  }, [handleVideoEnd])

  const showFallback = !currentItem || !isVideoReady(currentItem.id)

  return (
    <div 
      ref={containerRef}
      className={cn(
        "absolute inset-0 w-full h-full bg-black overflow-hidden",
        className
      )}
    >
      {/* 主视频渲染 */}
      {currentItem && (
        <>
          <video
            key={`${currentItem.id}-${currentIndex}`} // 强制重新渲染
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            poster={currentItem.posterUrl}
            muted
            autoPlay
            playsInline
            loop={items.length === 1}  // 单视频循环，多视频不循环
            preload="auto"  // 改为完整预加载
            controls={false}
            style={{ zIndex: 1 }}
            ref={(video) => {
              if (video) {
                // 强制播放
                video.play().catch(e => {
                  console.warn('Auto-play blocked:', e)
                })
              }
            }}
            onCanPlay={(e) => {
              const video = e.currentTarget
              video.play().catch(err => console.warn('Play failed:', err))
              onVideoCanPlay?.(currentItem.id)
            }}
            onError={(e) => {
              console.error('❌ Video error:', currentItem.id, e)
              // 如果当前视频加载失败，立即切换到下一个
              if (items.length > 1) {
                handleVideoEnd()
              }
            }}
            onLoadStart={() => {
            }}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget
            }}
            onEnded={() => {
              // 无论手动还是自动，视频结束都应该轮播（如果有多个视频）
              if (items.length > 1) {
                handleVideoEnd()
              } else {
              }
            }}
            onPlay={() => {
            }}
            onPause={() => {
            }}
            onStalled={() => {
              // 如果视频卡住超过5秒，切换到下一个
              if (items.length > 1) {
                setTimeout(() => {
                  handleVideoEnd()
                }, 5000)
              }
            }}
            onWaiting={() => {
            }}
            onSuspend={() => {
            }}
            onAbort={() => {
              // 视频被中止，立即切换到下一个
              if (items.length > 1) {
                handleVideoEnd()
              }
            }}
            onEmptied={() => {
            }}
          >
            <source src={currentItem.videoUrl} type="video/mp4" />
            <source src={currentItem.videoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>

          {/* 总是显示poster作为fallback */}
          <img
            src={currentItem.posterUrl}
            alt={currentItem.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
            onError={() => console.error('❌ Poster error:', currentItem.id)}
          />
        </>
      )}
      
      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40" style={{ zIndex: 2 }} />
    </div>
  )
}
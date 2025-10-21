"use client"

import type React from "react"
import { cn } from '@/lib/utils'
import type { VideoHeroItem } from './types/video-hero.types'

interface VideoBackgroundProps {
  items: VideoHeroItem[]
  currentIndex: number
  onVideoEnd?: () => void
  onVideoCanPlay?: (itemId: string) => void
  className?: string
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  items,
  currentIndex,
  onVideoEnd,
  onVideoCanPlay,
  className = ""
}) => {
  const currentItem = items[currentIndex]

  const handleVideoEnd = () => {
    if (items.length > 1) {
      onVideoEnd?.()
    }
  }

  if (!currentItem) return null

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full bg-black overflow-hidden",
        className
      )}
    >
      {/* Poster 背景图 - 总是显示作为 fallback */}
      <img
        src={currentItem.posterUrl}
        alt={currentItem.title}
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
        style={{ zIndex: 1 }}
        loading="eager"
        onError={() => console.warn('⚠️ Poster loading failed:', currentItem.id)}
      />

      {/* 主视频 */}
      <video
        key={`${currentItem.id}-${currentIndex}`}
        className="absolute inset-0 w-full h-full object-cover"
        src={currentItem.videoUrl}
        muted
        autoPlay
        playsInline
        loop={items.length === 1}
        preload="auto"
        crossOrigin="anonymous"
        controls={false}
        style={{ zIndex: 2 }}
        onCanPlay={(e) => {
          const video = e.currentTarget
          video.play().catch(err => console.warn('Play failed:', err))
          onVideoCanPlay?.(currentItem.id)
        }}
        onError={(e) => {
          console.warn('⚠️ Video loading failed:', currentItem.id)
          if (items.length > 1) {
            handleVideoEnd()
          }
        }}
        onEnded={() => {
          if (items.length > 1) {
            handleVideoEnd()
          }
        }}
      />

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40" style={{ zIndex: 3 }} />
    </div>
  )
}
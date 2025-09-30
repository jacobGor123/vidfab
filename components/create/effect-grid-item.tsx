"use client"

/**
 * Effect Grid Item Component
 * 特效网格项组件 - 支持预览图+hover视频播放
 */

import { useState, useRef } from 'react'
import { VideoEffect } from '@/lib/constants/video-effects'
import { cn } from '@/lib/utils'

interface EffectGridItemProps {
  effect: VideoEffect
  isSelected?: boolean
  onClick: (effect: VideoEffect) => void
}

export function EffectGridItem({ effect, isSelected, onClick }: EffectGridItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {
        // 播放失败则忽略
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const handleVideoLoad = () => {
    setVideoLoaded(true)
  }

  const handleClick = () => {
    onClick(effect)
  }

  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-gray-600 hover:border-gray-400"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 预览图片层 */}
      <div className="relative aspect-[9/16] bg-gray-800">
        <img
          src={effect.posterUrl}
          alt={effect.name}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isHovered && videoLoaded ? "opacity-0" : "opacity-100"
          )}
          loading="lazy"
        />

        {/* 视频层 - hover时显示 */}
        <video
          ref={videoRef}
          src={effect.videoUrl}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isHovered && videoLoaded ? "opacity-100" : "opacity-0"
          )}
          muted
          loop
          playsInline
          onLoadedData={handleVideoLoad}
          preload="none"
        />

        {/* 选中状态指示器 */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Hover播放指示器 */}
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="bg-black/50 rounded-full p-2">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* 特效名称 */}
      <div className="p-3 bg-gray-900">
        <h3 className={cn(
          "text-sm font-medium transition-colors duration-200",
          isSelected ? "text-blue-400" : "text-white"
        )}>
          {effect.name}
        </h3>
      </div>
    </div>
  )
}
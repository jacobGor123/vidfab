"use client"

import type React from "react"
import { useMobileDetection } from './hooks/use-mobile-detection'
import { useNetworkAware } from './hooks/use-network-aware'
import { useVideoPool } from './hooks/use-video-pool'
import { useVideoCarousel } from './hooks/use-video-carousel'
import { VideoBackground } from './video-background'
import { VideoNavigation } from './video-navigation'
import { HeroContent } from './hero-content'
import { HERO_VIDEO_ITEMS } from './config/video-hero.config'
import { cn } from '@/lib/utils'
import type { VideoHeroItem } from './types/video-hero.types'

interface VideoHeroContainerProps {
  onQuerySubmit?: (query: string) => void
  className?: string
  videoItems?: VideoHeroItem[] // 允许自定义视频配置
}

export const VideoHeroContainer: React.FC<VideoHeroContainerProps> = ({
  onQuerySubmit,
  className = "",
  videoItems = HERO_VIDEO_ITEMS // 默认使用首页配置
}) => {
  const { isMobile, isDesktop } = useMobileDetection()
  const { shouldPreloadVideos, shouldShowVideoBackground, isSlowConnection } = useNetworkAware()

  const {
    getVideo,
    isVideoReady,
    loadingCount,
    isPoolReady
  } = useVideoPool(videoItems, false) // 使用传入的配置

  const {
    state,
    controls,
    currentItem
  } = useVideoCarousel({
    items: videoItems, // 使用传入的配置
    onIndexChange: (index) => {
    },
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    // 如果有多个视频，总是进行轮播（无论是否自动播放状态）
    if (videoItems.length > 1) {
      controls.goToNext()
    }
  }

  const handleVideoCanPlay = (itemId: string) => {
  }

  return (
    <div className={cn(
      "relative min-h-screen overflow-hidden",
      "flex items-center justify-center",
      className
    )}>
      {/* Background Layer */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={videoItems}
          currentIndex={state.currentIndex}
          getVideo={getVideo}
          isVideoReady={isVideoReady}
          onVideoEnd={handleVideoEnd}
          onVideoCanPlay={handleVideoCanPlay}
        />
      ) : (
        /* 移动端回退到原始星空背景 - 直接在layout中处理 */
        <div className="absolute inset-0 -z-10">
          {/* 空div，让layout的SpaceBackground显示 */}
        </div>
      )}

      {/* Content Layer */}
      <HeroContent
        currentItem={currentItem}
        onQuerySubmit={onQuerySubmit}
        className="relative z-10"
      />

      {/* Navigation Layer - Desktop Only */}
      {isDesktop && shouldShowVideoBackground && videoItems.length > 1 && (
        <VideoNavigation
          items={videoItems}
          currentIndex={state.currentIndex}
          onItemSelect={(index) => {
            controls.goToIndex(index)
          }}
          isVideoReady={() => true} // 简化，总是显示可点击
          loadingCount={loadingCount}
        />
      )}
    </div>
  )
}
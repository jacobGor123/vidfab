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

interface VideoHeroContainerProps {
  onQuerySubmit: (query: string) => void
  className?: string
}

export const VideoHeroContainer: React.FC<VideoHeroContainerProps> = ({
  onQuerySubmit,
  className = ""
}) => {
  const { isMobile, isDesktop } = useMobileDetection()
  const { shouldPreloadVideos, shouldShowVideoBackground, isSlowConnection } = useNetworkAware()
  
  const {
    getVideo,
    isVideoReady,
    loadingCount,
    isPoolReady
  } = useVideoPool(HERO_VIDEO_ITEMS, false) // 暂时禁用预加载

  const {
    state,
    controls,
    currentItem
  } = useVideoCarousel({
    items: HERO_VIDEO_ITEMS,
    onIndexChange: (index) => {
      console.log('Video switched to:', HERO_VIDEO_ITEMS[index]?.title)
    },
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    console.log('🎬 handleVideoEnd called', {
      isAutoPlaying: state.isAutoPlaying,
      isPaused: state.isPaused,
      itemsLength: HERO_VIDEO_ITEMS.length
    })
    
    // 如果有多个视频，总是进行轮播（无论是否自动播放状态）
    if (HERO_VIDEO_ITEMS.length > 1) {
      console.log('🔄 Proceeding with next video')
      controls.goToNext()
    } else {
      console.log('📺 Single video mode, no switching needed')
    }
  }

  const handleVideoCanPlay = (itemId: string) => {
    console.log('Video ready:', itemId)
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
          items={HERO_VIDEO_ITEMS}
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
      {isDesktop && shouldShowVideoBackground && HERO_VIDEO_ITEMS.length > 1 && (
        <VideoNavigation
          items={HERO_VIDEO_ITEMS}
          currentIndex={state.currentIndex}
          onItemSelect={(index) => {
            console.log('🎯 Manual switch to:', index, HERO_VIDEO_ITEMS[index]?.title)
            controls.goToIndex(index)
          }}
          isVideoReady={() => true} // 简化，总是显示可点击
          loadingCount={loadingCount}
        />
      )}
    </div>
  )
}
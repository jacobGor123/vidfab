export interface VideoHeroItem {
  id: string
  title: string
  posterUrl: string
  videoUrl: string
  typingTexts: string[]
  duration?: number
}

export interface VideoPoolItem {
  id: string
  videoElement: HTMLVideoElement | null
  loadState: 'loading' | 'canplay' | 'error'
  isPreDecoded: boolean
  lastUsed: number
}

export interface VideoHeroState {
  currentIndex: number
  isAutoPlaying: boolean
  isTransitioning: boolean
  loadedVideos: Set<string>
  isMobile: boolean
  isPaused: boolean
}

export interface VideoCarouselControls {
  goToIndex: (index: number) => void
  goToNext: () => void
  goToPrevious: () => void
  pauseAutoPlay: () => void
  resumeAutoPlay: () => void
  toggleAutoPlay: () => void
}

export interface NetworkInfo {
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  downlink?: number
  effectiveType?: string
  saveData?: boolean
}

export interface VideoLoadingStrategy {
  type: 'poster-only' | 'current-only' | 'progressive' | 'aggressive'
  maxConcurrent: number
  preloadAll: boolean
}

export type VideoTransitionType = 'fade' | 'slide' | 'none'

export interface VideoHeroConfig {
  autoResumeDelay: number
  transitionDuration: number
  typingSyncDelay: number
  maxPreloadCount: number
  videoLoadTimeout: number
  retryAttempts: number
  mobileBreakpoint: number
  mobileDisableVideo: boolean
  networkAware: boolean
  transitionType: VideoTransitionType
}
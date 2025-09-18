import type { VideoHeroConfig, VideoHeroItem, VideoLoadingStrategy } from '../types/video-hero.types'

export const VIDEO_HERO_CONFIG: VideoHeroConfig = {
  autoResumeDelay: 25000,
  transitionDuration: 1000,
  typingSyncDelay: 300,
  maxPreloadCount: 3,
  videoLoadTimeout: 10000,
  retryAttempts: 2,
  mobileBreakpoint: 1024,
  mobileDisableVideo: true,
  networkAware: true,
  transitionType: 'fade'
}

export const LOADING_STRATEGIES: Record<string, VideoLoadingStrategy> = {
  'slow-2g': {
    type: 'poster-only',
    maxConcurrent: 0,
    preloadAll: false
  },
  '2g': {
    type: 'poster-only',
    maxConcurrent: 0,
    preloadAll: false
  },
  '3g': {
    type: 'current-only',
    maxConcurrent: 1,
    preloadAll: false
  },
  '4g': {
    type: 'progressive',
    maxConcurrent: 2,
    preloadAll: false
  },
  unknown: {
    type: 'aggressive',
    maxConcurrent: 3,
    preloadAll: true
  }
}

export const HERO_VIDEO_ITEMS: VideoHeroItem[] = [
  {
    id: 'sailboat',
    title: 'Ocean Adventure',
    posterUrl: 'https://image01.vidu.zone/vidu/media-asset/sailboat-8eee19ce.webp',
    videoUrl: 'https://image01.vidu.zone/vidu/landing-page/sailboat.14774333.mp4',
    typingTexts: [
      "A majestic sailboat plows through the deep blue sea...",
    ]
  },
  {
    id: 'banner2',
    title: 'Creative Vision', 
    posterUrl: 'https://image01.vidu.zone/vidu/media-asset/banner2-9da68e3f.webp',
    videoUrl: 'https://image01.vidu.zone/vidu/landing-page/banner2.c92f22ed.mp4',
    typingTexts: [
      "The rabbit warrior slowly raises his sword and...",
    ]
  }
]

export const PRELOAD_PHASES = {
  PHASE_1: { delay: 0, priority: 'high' as const },
  PHASE_2: { delay: 2000, priority: 'medium' as const },
  PHASE_3: { delay: 5000, priority: 'low' as const }
}
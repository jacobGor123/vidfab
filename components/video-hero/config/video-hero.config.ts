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
    id: 'steampunk-robot',
    title: 'Steampunk Robot',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760346158725.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760346158725.mp4',
    typingTexts: [
      "A steampunk-style robot walks through the fog-shrouded streets of London.",
    ]
  },
  {
    id: 'fairy-elf',
    title: 'Fairy Elf Girl',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760347087819.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760347087819.mp4',
    typingTexts: [
      "A fairy-like elf girl wearing a crystal crown stands in an enchanted forest, surrounded by twinkling stars and glowing mushrooms, as if from a fairy tale.",
    ]
  }
]

// Image-to-Video 专用配置（移除了已迁移到首页的 steampunk-robot）
export const IMAGE_TO_VIDEO_ITEMS: VideoHeroItem[] = [
  {
    id: 'image-to-video-1',
    title: 'Dynamic Animation',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760346921326.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760346921326.mp4',
    typingTexts: [
      "Transform still images into captivating motion...",
    ]
  },
  {
    id: 'image-to-video-2',
    title: 'Cinematic Effect',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760350705877.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760350705877.mp4',
    typingTexts: [
      "Bring your photos to life with AI-powered animation...",
    ]
  }
]

// Text-to-Video 专用配置（移除了已迁移到首页的 fairy-elf）
export const TEXT_TO_VIDEO_ITEMS: VideoHeroItem[] = [
  {
    id: 'text-to-video-2',
    title: 'Story Visualization',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760351981368.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760351981368.mp4',
    typingTexts: [
      "Turn your ideas into cinematic reality...",
    ]
  },
  {
    id: 'text-to-video-3',
    title: 'Concept to Video',
    posterUrl: 'https://static.vidfab.ai/public/image/vidfab-video-1760408184680.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/vidfab-video-1760408184680.mp4',
    typingTexts: [
      "Transform words into dynamic visual stories...",
    ]
  }
]

// AI Video Effects 专用配置（使用首页 "Pick a Popular Effect" 模块的视频）
export const AI_VIDEO_EFFECTS_ITEMS: VideoHeroItem[] = [
  {
    id: 'ai-video-effects-1',
    title: 'Popular Effects',
    posterUrl: 'https://static.vidfab.ai/public/image/home-step-03-poster.webp',
    videoUrl: 'https://static.vidfab.ai/public/video/home-step-03.mp4',
    typingTexts: [
      "Apply stunning AI effects to your videos...",
    ]
  }
]

// Text-to-Image 专用配置
export const TEXT_TO_IMAGE_ITEMS: VideoHeroItem[] = [
  {
    id: 'text-to-image-hero',
    title: 'Text to Image',
    posterUrl: 'https://static.vidfab.ai/public/image/text-image-hero.webp',
    videoUrl: '', // 无视频，使用静态图片背景
    typingTexts: [
      "A girl stands in the bustling city center at night, surrounded by neon lights and towering skyscrapers...",
    ]
  }
]

// Image-to-Image 专用配置 - 4 张图片轮播，每张对应不同的 prompt
export const IMAGE_TO_IMAGE_ITEMS: VideoHeroItem[] = [
  {
    id: 'image-to-image-hero-1',
    title: 'Realistic Style',
    posterUrl: 'https://static.vidfab.ai/public/image/image-image-hero-1.webp',
    videoUrl: '',
    typingTexts: [
      "Realistic style...",
    ]
  },
  {
    id: 'image-to-image-hero-2',
    title: 'Science Fiction Style',
    posterUrl: 'https://static.vidfab.ai/public/image/image-image-hero-2.webp',
    videoUrl: '',
    typingTexts: [
      "Science fiction style...",
    ]
  },
  {
    id: 'image-to-image-hero-3',
    title: 'Illustration Style',
    posterUrl: 'https://static.vidfab.ai/public/image/image-image-hero-3.webp',
    videoUrl: '',
    typingTexts: [
      "Illustration style...",
    ]
  },
  {
    id: 'image-to-image-hero-4',
    title: 'Animation Style',
    posterUrl: 'https://static.vidfab.ai/public/image/image-image-hero-4.webp',
    videoUrl: '',
    typingTexts: [
      "Animation style...",
    ]
  }
]

export const PRELOAD_PHASES = {
  PHASE_1: { delay: 0, priority: 'high' as const },
  PHASE_2: { delay: 2000, priority: 'medium' as const },
  PHASE_3: { delay: 5000, priority: 'low' as const }
}
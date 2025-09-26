import { MediaQuality } from "@/types/video-optimization"
import type { VideoData } from "@/types/video-optimization"

// 演示用的公开视频资源 - 用于测试视频播放功能
const demoVideoEntries = [
  {
    prompt: "Cinematic sunrise over mountains",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    title: "Mountain Sunrise"
  },
  {
    prompt: "Ocean waves crashing on beach",
    imageUrl: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    title: "Ocean Waves"
  },
  {
    prompt: "City lights at night",
    imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    title: "City Nights"
  },
  {
    prompt: "Forest with morning mist",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    title: "Misty Forest"
  },
  {
    prompt: "Desert landscape with sand dunes",
    imageUrl: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    title: "Desert Dunes"
  }
]

const randomUsernames = [
  "Alex Turner", "Maya Chen", "James Wilson", "Sofia Rodriguez", "David Kim",
  "Emma Thompson", "Lucas Garcia", "Zoe Martinez", "Ryan O'Connor", "Aria Patel"
]

// 分类逻辑
const categoryKeywords = {
  nature: ['mountain', 'ocean', 'forest', 'beach', 'waves', 'sunrise', 'sunset', 'landscape', 'desert'],
  urban: ['city', 'lights', 'night', 'street', 'building', 'traffic'],
  cinematic: ['cinematic', 'dramatic', 'epic', 'movie', 'film'],
  abstract: ['abstract', 'geometric', 'particle', 'fluid'],
  lifestyle: ['people', 'person', 'human', 'lifestyle'],
  technology: ['tech', 'digital', 'cyber', 'robot', 'ai'],
  portrait: ['face', 'portrait', 'person', 'character'],
  fantasy: ['magic', 'fantasy', 'mystical', 'ethereal']
}

function categorizePrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()
  const scores: { [key: string]: number } = {}

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.reduce((score, keyword) => {
      return lowerPrompt.includes(keyword) ? score + 1 : score
    }, 0)
  })

  const bestCategory = Object.entries(scores).reduce((a, b) =>
    scores[a[0]] > scores[b[0]] ? a : b
  )[0]

  return scores[bestCategory] > 0 ? bestCategory : 'cinematic'
}

// 转换为VideoData格式
export const demoVideoTemplatesData: VideoData[] = demoVideoEntries.map((entry, index) => {
  const category = categorizePrompt(entry.prompt)
  const randomUsername = randomUsernames[index % randomUsernames.length]
  const videoId = `demo-video-${index + 1}`

  return {
    id: videoId,
    title: entry.title,
    description: entry.prompt,
    prompt: entry.prompt,
    duration: (index % 8) + 7, // 7-15 seconds, deterministic based on index
    aspectRatio: (index % 10) > 7 ? '9:16' : '16:9', // deterministic based on index
    category: category,
    user: {
      id: randomUsername.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: randomUsername,
      avatar: "/placeholder-user.jpg"
    },
    createdAt: new Date(Date.now() - ((index * 2 + 1) * 24 * 60 * 60 * 1000)), // Deterministic date based on index
    urls: {
      thumbnail: {
        webp: entry.imageUrl,
        jpg: entry.imageUrl,
        placeholder: entry.imageUrl
      },
      video: {
        low: entry.videoUrl,
        medium: entry.videoUrl,
        high: entry.videoUrl,
        preview: entry.videoUrl
      },
      poster: entry.imageUrl
    },
    metadata: {
      fileSize: {
        low: (index % 5 + 2) * 1024 * 1024, // Deterministic file size
        medium: (index % 10 + 8) * 1024 * 1024,
        high: (index % 20 + 15) * 1024 * 1024
      },
      resolution: {
        width: (index % 10) > 7 ? 720 : 1280, // Deterministic resolution
        height: (index % 10) > 7 ? 1280 : 720
      },
      bitrate: (index % 3000) + 2000, // Deterministic bitrate
      codec: 'h264'
    },
    loadState: 'idle',
    quality: MediaQuality.AUTO,
    preloadStrategy: 'metadata'
  }
})

// 分类定义
export const demoCategoriesData = [
  {
    name: "All",
    key: "all",
    count: demoVideoTemplatesData.length
  },
  {
    name: "Nature",
    key: "nature",
    count: demoVideoTemplatesData.filter(v => v.category === 'nature').length
  },
  {
    name: "Urban",
    key: "urban",
    count: demoVideoTemplatesData.filter(v => v.category === 'urban').length
  },
  {
    name: "Cinematic",
    key: "cinematic",
    count: demoVideoTemplatesData.filter(v => v.category === 'cinematic').length
  }
]
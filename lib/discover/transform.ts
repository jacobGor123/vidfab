/**
 * Discover 数据格式转换
 * 将数据库格式转换为前端 VideoData 格式
 */

import type { DiscoverVideo } from '@/types/discover'
import type { VideoData } from '@/types/video-optimization'
import { MediaQuality } from '@/types/video-optimization'

/**
 * 将 Discover 数据库记录转换为 VideoData 格式
 * 兼容现有的 template-gallery 组件
 */
export function transformDiscoverToVideoData(discover: DiscoverVideo): VideoData {
  return {
    id: discover.id,
    title: discover.prompt.slice(0, 50) + (discover.prompt.length > 50 ? '...' : ''),
    description: discover.prompt,
    prompt: discover.prompt,
    duration: 10, // 默认值，可后续从视频元数据获取
    aspectRatio: '16:9', // 默认值
    category: discover.category,
    user: {
      id: 'vidfab',
      name: 'VidFab',
      avatar: '/placeholder-user.jpg'
    },
    createdAt: new Date(discover.created_at),
    urls: {
      thumbnail: {
        webp: discover.image_url || discover.video_url,
        jpg: discover.image_url || discover.video_url,
        placeholder: discover.image_url || discover.video_url
      },
      video: {
        low: discover.video_url,
        medium: discover.video_url,
        high: discover.video_url,
        preview: discover.video_url
      },
      poster: discover.image_url || discover.video_url
    },
    metadata: {
      fileSize: {
        low: 5 * 1024 * 1024,
        medium: 10 * 1024 * 1024,
        high: 20 * 1024 * 1024
      },
      resolution: {
        width: 1280,
        height: 720
      },
      bitrate: 3000,
      codec: 'h264'
    },
    loadState: 'idle',
    quality: MediaQuality.AUTO,
    preloadStrategy: 'metadata'
  }
}

/**
 * 批量转换
 */
export function transformDiscoverListToVideoData(discovers: DiscoverVideo[]): VideoData[] {
  return discovers.map(transformDiscoverToVideoData)
}

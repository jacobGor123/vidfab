/**
 * YouTube 视频时长获取
 * 使用 YouTube Data API v3 获取视频的真实时长
 */

import { extractYouTubeVideoId } from './youtube-utils'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

/**
 * YouTube API 响应接口
 */
interface YouTubeVideoResponse {
  items: Array<{
    id: string
    contentDetails: {
      duration: string // ISO 8601 格式，如 "PT1M30S" = 1分30秒
    }
  }>
}

/**
 * 解析 ISO 8601 duration 格式为秒数
 * 格式示例：
 * - PT10S = 10 秒
 * - PT1M30S = 90 秒
 * - PT1H2M10S = 3730 秒
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)

  if (!match) {
    throw new Error(`Invalid ISO 8601 duration format: ${duration}`)
  }

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * 获取 YouTube 视频时长（秒）
 * @param videoUrl - YouTube 视频 URL
 * @returns 视频时长（秒）
 */
export async function getYouTubeDuration(videoUrl: string): Promise<number> {
  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube API] API key not configured, using fallback duration')
    // 如果没有配置 API key，返回默认时长（避免完全失败）
    return 30
  }

  // 1. 提取视频 ID
  const videoId = extractYouTubeVideoId(videoUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL: cannot extract video ID')
  }

  console.log('[YouTube API] Fetching video duration for:', videoId)

  // 2. 调用 YouTube Data API v3
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`

  try {
    const response = await fetch(apiUrl)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`YouTube API error: ${response.status} - ${errorText}`)
    }

    const data: YouTubeVideoResponse = await response.json()

    // 3. 检查是否找到视频
    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`)
    }

    // 4. 解析时长
    const isoDuration = data.items[0].contentDetails.duration
    const durationSeconds = parseISO8601Duration(isoDuration)

    console.log('[YouTube API] Video duration:', {
      videoId,
      isoDuration,
      seconds: durationSeconds
    })

    return durationSeconds

  } catch (error: any) {
    console.error('[YouTube API] Failed to get video duration:', error)
    throw new Error(`Failed to get YouTube video duration: ${error.message}`)
  }
}

/**
 * Video Analyzer - YouTube URL 工具函数
 */

/**
 * 视频来源类型
 */
export type VideoSource =
  | { type: 'youtube'; url: string }
  | { type: 'local'; url: string }

/**
 * 验证 YouTube URL 格式（支持普通视频、Shorts、短链接）
 */
export function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/
  return youtubeRegex.test(url)
}

/**
 * 提取 YouTube 视频 ID（支持普通视频、Shorts、短链接）
 */
export function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/
  const match = url.match(regex)
  return match ? match[1] : null
}

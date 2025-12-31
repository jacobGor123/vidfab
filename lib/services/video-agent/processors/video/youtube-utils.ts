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
 * 标准化 YouTube URL（确保包含 https:// 前缀）
 * Gemini API 要求必须是完整的 HTTP(S) URI
 */
export function normalizeYouTubeUrl(url: string): string {
  // 如果已经包含协议，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 如果以 www. 开头，添加 https://
  if (url.startsWith('www.')) {
    return `https://${url}`
  }

  // 如果以 youtube.com 或 youtu.be 开头，添加 https://www.
  if (url.startsWith('youtube.com')) {
    return `https://www.${url}`
  }

  if (url.startsWith('youtu.be')) {
    return `https://${url}`
  }

  // 默认添加 https://www.
  return `https://www.${url}`
}

/**
 * 提取 YouTube 视频 ID（支持普通视频、Shorts、短链接）
 */
export function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * 将 YouTube URL 转换为标准 watch 格式
 * Gemini API 可能只支持标准的 watch?v= 格式，不支持 Shorts
 *
 * @param url YouTube URL（任意格式）
 * @returns 标准的 https://www.youtube.com/watch?v=xxx 格式
 */
export function convertToStandardYouTubeUrl(url: string): string {
  // 先标准化 URL（确保有协议）
  const normalizedUrl = normalizeYouTubeUrl(url)

  // 提取视频 ID
  const videoId = extractYouTubeVideoId(normalizedUrl)

  if (!videoId) {
    // 如果无法提取 ID，返回原 URL
    return normalizedUrl
  }

  // 转换为标准格式
  return `https://www.youtube.com/watch?v=${videoId}`
}

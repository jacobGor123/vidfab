/**
 * 视频 Poster 工具函数
 *
 * 功能：
 * 1. 根据视频 URL 自动生成 poster URL
 * 2. 支持本地和 CDN 视频
 * 3. 提供 fallback 机制
 *
 * 使用示例：
 * ```tsx
 * import { getVideoPoster } from '@/lib/utils/video-poster'
 *
 * <video
 *   src="https://static.vidfab.ai/discover-new/discover-new-01.mp4"
 *   poster={getVideoPoster("https://static.vidfab.ai/discover-new/discover-new-01.mp4")}
 * />
 * ```
 */

/**
 * 根据视频 URL 获取对应的 poster 图片 URL
 *
 * @param videoUrl - 视频 URL（支持本地路径或 CDN URL）
 * @param options - 可选配置
 * @returns Poster 图片 URL
 *
 * @example
 * // CDN 视频
 * getVideoPoster("https://static.vidfab.ai/discover-new/discover-new-01.mp4")
 * // → "https://static.vidfab.ai/posters/discover-new/discover-new-01.webp"
 *
 * // 本地视频
 * getVideoPoster("/video/home-step-01.mp4")
 * // → "/posters/home-step-01.webp"
 */
export function getVideoPoster(
  videoUrl: string,
  options?: {
    /** 是否使用本地 poster（默认 false，使用 CDN） */
    useLocal?: boolean
    /** 图片格式（默认 webp） */
    format?: 'webp' | 'jpg' | 'png'
  }
): string {
  const { useLocal = false, format = 'webp' } = options || {}

  try {
    // 解析视频 URL
    const isAbsoluteUrl = videoUrl.startsWith('http')

    if (isAbsoluteUrl) {
      // CDN 视频：https://static.vidfab.ai/discover-new/discover-new-01.mp4
      const url = new URL(videoUrl)
      const pathname = url.pathname // /discover-new/discover-new-01.mp4

      // 提取文件名和路径
      const pathParts = pathname.split('/')
      const filename = pathParts.pop()?.replace(/\.(mp4|webm|mov)$/, '') || 'default'
      const subPath = pathParts.filter(Boolean).join('/')

      // 构建 poster URL
      if (useLocal) {
        // 本地 poster: /posters/discover-new/discover-new-01.webp
        return `/posters/${subPath}/${filename}.${format}`.replace('//', '/')
      } else {
        // CDN poster: https://static.vidfab.ai/posters/discover-new/discover-new-01.webp
        return `${url.origin}/posters/${subPath}/${filename}.${format}`.replace('//', '/')
      }
    } else {
      // 本地视频：/video/home-step-01.mp4
      const pathParts = videoUrl.split('/')
      const filename = pathParts.pop()?.replace(/\.(mp4|webm|mov)$/, '') || 'default'
      const subPath = pathParts.filter((p) => p && p !== 'video').join('/')

      // 构建本地 poster URL
      return `/posters/${subPath}/${filename}.${format}`.replace('//', '/')
    }
  } catch (error) {
    console.error('Failed to generate poster URL:', error)
    // Fallback：返回空字符串（浏览器会显示视频第一帧）
    return ''
  }
}

/**
 * 批量获取视频的 poster URLs
 *
 * @param videoUrls - 视频 URL 数组
 * @param options - 可选配置
 * @returns Poster URL 数组
 *
 * @example
 * const videos = [
 *   "https://static.vidfab.ai/discover-new/discover-new-01.mp4",
 *   "https://static.vidfab.ai/discover-new/discover-new-02.mp4"
 * ]
 * const posters = getBatchVideoPosters(videos)
 */
export function getBatchVideoPosters(
  videoUrls: string[],
  options?: Parameters<typeof getVideoPoster>[1]
): string[] {
  return videoUrls.map((url) => getVideoPoster(url, options))
}

/**
 * 检查 poster 是否存在（客户端使用）
 * 注意：这会发起网络请求，仅在需要时使用
 *
 * @param posterUrl - Poster URL
 * @returns Promise<boolean>
 */
export async function checkPosterExists(posterUrl: string): Promise<boolean> {
  try {
    const response = await fetch(posterUrl, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 获取 poster 并提供 fallback（客户端使用）
 *
 * @param videoUrl - 视频 URL
 * @param options - 可选配置
 * @returns Promise<string> - 存在的 poster URL 或空字符串
 *
 * @example
 * const poster = await getVideoPosterWithFallback(videoUrl)
 * <video src={videoUrl} poster={poster} />
 */
export async function getVideoPosterWithFallback(
  videoUrl: string,
  options?: Parameters<typeof getVideoPoster>[1]
): Promise<string> {
  // 首先尝试 CDN poster
  const cdnPoster = getVideoPoster(videoUrl, { ...options, useLocal: false })
  const cdnExists = await checkPosterExists(cdnPoster)

  if (cdnExists) {
    return cdnPoster
  }

  // 然后尝试本地 poster
  const localPoster = getVideoPoster(videoUrl, { ...options, useLocal: true })
  const localExists = await checkPosterExists(localPoster)

  if (localExists) {
    return localPoster
  }

  // 都不存在，返回空（浏览器会显示视频第一帧）
  return ''
}

/**
 * FFmpeg Setup - FFmpeg 全局配置
 * 为 Vercel Serverless 环境设置 FFmpeg 二进制文件路径
 * 参考 roomx-ai 项目的实现
 */

import { ensureFFmpegAvailable } from './ffmpeg-utils'

let ffmpegConfigured = false

/**
 * 配置 fluent-ffmpeg 使用正确的 FFmpeg 二进制文件
 * 在 Vercel Serverless 环境中使用 @ffmpeg-installer/ffmpeg
 *
 * @returns 配置后的 fluent-ffmpeg 模块
 */
export async function setupFfmpeg() {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

  // 只配置一次，避免重复设置
  if (!ffmpegConfigured) {
    try {
      // 🔥 使用 roomx-ai 的路径检测逻辑
      const ffmpegPath = await ensureFFmpegAvailable()

      // 设置 FFmpeg 二进制文件路径
      ffmpeg.setFfmpegPath(ffmpegPath)

      console.log('[FFmpegSetup] ✅ FFmpeg configured with path:', ffmpegPath)
      ffmpegConfigured = true
    } catch (error) {
      console.error('[FFmpegSetup] ❌ Failed to configure FFmpeg:', error)
      throw error
    }
  }

  return ffmpeg
}

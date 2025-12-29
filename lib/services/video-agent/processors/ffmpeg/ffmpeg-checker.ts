/**
 * FFmpeg Checker - FFmpeg 可用性检查
 * 检查服务器上是否已安装 FFmpeg
 *
 * 在 Vercel Serverless 环境中，使用 @ffmpeg-installer/ffmpeg 提供 FFmpeg 二进制文件
 */

import { ensureFFmpegAvailable } from './ffmpeg-utils'

/**
 * 检查 FFmpeg 是否可用
 * @returns FFmpeg 是否已安装
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    // 🔥 尝试获取 FFmpeg 路径（参考 roomx-ai 实现）
    await ensureFFmpegAvailable()
    console.log('[FFmpegChecker] ✅ FFmpeg is available')
    return true
  } catch (error) {
    console.error('[FFmpegChecker] ❌ FFmpeg 未安装或不可用:', error)
    return false
  }
}

/**
 * FFmpeg Checker - FFmpeg 可用性检查
 * 检查服务器上是否已安装 FFmpeg
 *
 * 在 Vercel Serverless 环境中，使用 @ffmpeg-installer/ffmpeg 提供 FFmpeg 二进制文件
 */

/**
 * 检查 FFmpeg 是否可用
 * @returns FFmpeg 是否已安装
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    // 🔥 使用统一的 setupFfmpeg 配置（包含 FFmpeg 二进制路径）
    const { setupFfmpeg } = await import('./ffmpeg-setup')
    const ffmpeg = await setupFfmpeg()

    return new Promise((resolve) => {
      ffmpeg().getAvailableFormats((err: Error | null) => {
        if (err) {
          console.error('[FFmpegChecker] ❌ FFmpeg check failed:', err)
        } else {
          console.log('[FFmpegChecker] ✅ FFmpeg is available')
        }
        resolve(!err)
      })
    })
  } catch (error) {
    console.error('[FFmpegChecker] ❌ FFmpeg 未安装或不可用:', error)
    return false
  }
}

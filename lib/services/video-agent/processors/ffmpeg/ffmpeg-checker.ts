/**
 * FFmpeg Checker - FFmpeg 可用性检查
 * 检查服务器上是否已安装 FFmpeg
 */

/**
 * 检查 FFmpeg 是否可用
 * @returns FFmpeg 是否已安装
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    // 动态导入 fluent-ffmpeg
    const ffmpeg = await import('fluent-ffmpeg')

    return new Promise((resolve) => {
      ffmpeg.default().getAvailableFormats((err: Error | null) => {
        resolve(!err)
      })
    })
  } catch (error) {
    console.error('[FFmpegChecker] FFmpeg 未安装或不可用:', error)
    return false
  }
}

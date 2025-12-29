/**
 * Subtitle Processor - 字幕处理器
 * 为视频添加字幕（烧录到视频中）
 */

/**
 * 为视频添加字幕（烧录到视频中）
 * @param videoPath 输入视频路径
 * @param srtPath SRT 字幕文件路径
 * @param outputPath 输出视频路径
 * @param options 字幕样式选项
 */
export async function addSubtitlesToVideo(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  options?: {
    fontName?: string
    fontSize?: number
    primaryColor?: string
    outlineColor?: string
    outline?: number
    shadow?: number
    alignment?: number
    marginV?: number  // 底部边距
  }
): Promise<void> {
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()

  // 默认字幕样式（白色字体，黑色描边，底部居中）
  const fontName = options?.fontName || 'Arial'
  const fontSize = options?.fontSize || 18
  const primaryColor = options?.primaryColor || '&HFFFFFF'  // 白色
  const outlineColor = options?.outlineColor || '&H000000'  // 黑色
  const outline = options?.outline || 2
  const shadow = options?.shadow || 1
  const alignment = options?.alignment || 2  // 底部居中
  const marginV = options?.marginV || 30

  // 构建字幕样式字符串
  const subtitleStyle = [
    `FontName=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColor}`,
    `OutlineColour=${outlineColor}`,
    `BorderStyle=1`,
    `Outline=${outline}`,
    `Shadow=${shadow}`,
    `Alignment=${alignment}`,
    `MarginV=${marginV}`
  ].join(',')

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .outputOptions([
        `-vf subtitles=${srtPath}:force_style='${subtitleStyle}'`,
        '-preset veryfast',
        '-crf 23',
        '-threads 0'
      ])
      .videoCodec('libx264')
      .audioCodec('copy')  // 保留原音频
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[SubtitleProcessor] 添加字幕（优化模式）:', cmd)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[SubtitleProcessor] 字幕渲染进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[SubtitleProcessor] 字幕添加完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[SubtitleProcessor] 添加字幕失败:', err)
        reject(err)
      })
      .run()
  })
}

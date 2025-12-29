/**
 * Video Concatenation - 视频拼接处理器
 * 提供简单拼接和带转场效果的拼接
 */

import { VideoClip } from '../../video-composer'

/**
 * 简单拼接视频（无转场）
 * @param clips 视频片段列表（带本地路径）
 * @param outputPath 输出文件路径
 * @returns 执行结果
 */
export async function simpleConcatVideos(
  clips: VideoClip[],
  outputPath: string
): Promise<void> {
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()

  return new Promise((resolve, reject) => {
    const command = ffmpeg()

    // 添加所有输入文件
    clips.forEach(clip => {
      if (!clip.local_path) {
        throw new Error(`片段 ${clip.shot_number} 缺少本地路径`)
      }
      command.input(clip.local_path)
    })

    // 使用 concat 协议拼接
    command
      .on('start', (commandLine: string) => {
        console.log('[VideoConcat] 开始拼接视频:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[VideoConcat] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[VideoConcat] 视频拼接完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[VideoConcat] 视频拼接失败:', err)
        reject(err)
      })
      .mergeToFile(outputPath, '/tmp/video-agent')
  })
}

/**
 * 添加淡入淡出转场效果
 * 注意：这是一个简化版本，复杂的转场需要使用 xfade 滤镜
 *
 * @param clips 视频片段列表
 * @param outputPath 输出路径
 * @param transitionDuration 转场时长（秒）
 * @returns 执行结果
 */
export async function addFadeTransitions(
  clips: VideoClip[],
  outputPath: string,
  transitionDuration: number = 0.5
): Promise<void> {
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()

  return new Promise((resolve, reject) => {
    const command = ffmpeg()

    // 为每个片段添加淡入淡出效果
    const filterComplex: string[] = []

    clips.forEach((clip, index) => {
      if (!clip.local_path) {
        throw new Error(`片段 ${clip.shot_number} 缺少本地路径`)
      }

      command.input(clip.local_path)

      // 添加淡入淡出滤镜
      const fadeIn = index === 0 ? `fade=t=in:st=0:d=${transitionDuration}` : ''
      const fadeOut = index === clips.length - 1
        ? `fade=t=out:st=${clip.duration - transitionDuration}:d=${transitionDuration}`
        : ''

      const filters = [fadeIn, fadeOut].filter(Boolean).join(',')

      if (filters) {
        filterComplex.push(`[${index}:v]${filters}[v${index}]`)
      } else {
        filterComplex.push(`[${index}:v]null[v${index}]`)
      }
    })

    // 拼接所有片段
    const concatInputs = clips.map((_, i) => `[v${i}]`).join('')
    filterComplex.push(`${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`)

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [outv]',
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-threads 0'
      ])
      .on('start', (commandLine: string) => {
        console.log('[VideoConcat] 开始添加转场效果:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[VideoConcat] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[VideoConcat] 转场效果添加完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[VideoConcat] 添加转场效果失败:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

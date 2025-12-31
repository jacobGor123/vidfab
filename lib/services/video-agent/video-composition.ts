/**
 * Video Agent - Video Composition
 * 视频合成核心功能
 */

import fs from 'fs'
import path from 'path'
import type { VideoClip, MusicConfig, VideoCompositionOptions } from '@/lib/types/video-agent'
import { downloadAllClips, downloadVideo } from './video-downloader'
import { generateConcatFile, buildTransitionFilter, getResolutionParams } from './ffmpeg-config'
import { estimateTotalDuration } from './video-composer-utils'

/**
 * 使用 FFmpeg 合成最终视频
 *
 * 注意: 这是一个简化的实现,实际使用时需要:
 * 1. 安装 fluent-ffmpeg 包: npm install fluent-ffmpeg @types/fluent-ffmpeg
 * 2. 安装 FFmpeg 可执行文件
 * 3. 在服务器环境(如 EC2)中运行,Vercel Edge Functions 不支持 FFmpeg
 *
 * @param options 合成选项
 * @returns 输出文件路径
 */
export async function composeVideo(options: VideoCompositionOptions): Promise<string> {
  const {
    clips,
    music,
    transition,
    outputPath,
    resolution = '720p',
    fps = 30
  } = options

  console.log('[VideoComposer] 开始合成视频', {
    clipCount: clips.length,
    hasMusic: !!music,
    hasTransition: !!transition,
    resolution,
    fps
  })

  // 步骤 1: 下载所有视频片段
  const clipsWithPaths = await downloadAllClips(clips)

  // 步骤 2: 生成 concat 文件
  const tempDir = '/tmp/video-agent'
  const concatFilePath = path.join(tempDir, 'concat_list.txt')
  generateConcatFile(clipsWithPaths, concatFilePath)

  // 步骤 3: 下载背景音乐(如果有)
  let musicPath: string | undefined
  if (music) {
    musicPath = path.join(tempDir, 'background_music.mp3')
    await downloadVideo(music.url, musicPath)
  }

  // 步骤 4: 构建 FFmpeg 命令
  // 注意: 这里需要使用 fluent-ffmpeg 或直接调用 FFmpeg 命令行
  // 以下是命令行示例,实际实现需要使用 child_process.exec 或 fluent-ffmpeg

  const { width, height } = getResolutionParams(resolution)

  let ffmpegCommand = `ffmpeg -f concat -safe 0 -i ${concatFilePath}`

  // 添加视频滤镜(转场)
  if (transition) {
    const transitionFilter = buildTransitionFilter(clips.length, transition)
    if (transitionFilter) {
      ffmpegCommand += ` -vf "${transitionFilter}"`
    }
  }

  // 设置输出参数
  ffmpegCommand += ` -c:v libx264 -preset medium -crf 23 -r ${fps} -s ${width}x${height}`

  // 添加音乐混音(如果有)
  if (musicPath && music) {
    const tempVideoPath = path.join(tempDir, 'temp_video.mp4')

    // 先生成无音频的视频
    ffmpegCommand += ` ${tempVideoPath}`

    // 然后添加音乐
    let musicCommand = `ffmpeg -i ${tempVideoPath} -i ${musicPath}`

    // 设置音量
    if (music.volume !== undefined) {
      musicCommand += ` -filter:a "volume=${music.volume}"`
    }

    // 设置淡入淡出
    if (music.fadeIn || music.fadeOut) {
      const fadeIn = music.fadeIn || 0
      const fadeOut = music.fadeOut || 0
      musicCommand += ` -af "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOut}:d=${fadeOut}"`
    }

    musicCommand += ` -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest ${outputPath}`

    console.log('[VideoComposer] FFmpeg 音乐混音命令:', musicCommand)
  } else {
    ffmpegCommand += ` ${outputPath}`
  }

  console.log('[VideoComposer] FFmpeg 合成命令:', ffmpegCommand)

  // 步骤 5: 执行 FFmpeg 命令
  // 注意: 这里需要实际执行 FFmpeg 命令
  // 可以使用 child_process.exec 或 fluent-ffmpeg
  // 示例代码在这里省略,因为需要外部依赖

  // 临时: 抛出错误提示需要实际实现
  throw new Error(
    'FFmpeg 合成功能需要在服务器环境中实现。' +
    '请在 EC2/VPS 上安装 FFmpeg 并使用 fluent-ffmpeg 或 child_process.exec 执行命令。' +
    '\n\nFFmpeg 命令已生成: ' + ffmpegCommand
  )
}

/**
 * 合成视频（无转场，直接拼接）
 *
 * @param clips 视频片段列表
 * @param outputPath 输出文件路径
 * @param music 背景音乐配置（可选）
 * @param transitionDuration 保留参数（向后兼容，实际不使用）
 * @param segmentDuration 保留参数（向后兼容，实际不使用）
 * @returns 输出文件路径
 */
export async function composeVideoWithCrossfade(
  clips: VideoClip[],
  outputPath: string,
  music?: MusicConfig,
  transitionDuration: number = 0.5,
  segmentDuration: number = 5
): Promise<string> {
  const { addBackgroundMusic, simpleConcatVideos } = await import('./processors/ffmpeg')

  console.log('[VideoComposer] 🔥 开始视频合成（无转场）', {
    clipCount: clips.length,
    hasMusic: !!music
  })

  const tempDir = '/tmp/video-agent'

  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  try {
    // 步骤 1: 下载所有视频片段
    console.log('[VideoComposer] 下载视频片段...')
    const clipsWithPaths = await downloadAllClips(clips, tempDir)

    // 提取本地路径
    const localPaths = clipsWithPaths
      .map(clip => clip.local_path)
      .filter((p): p is string => !!p)

    if (localPaths.length === 0) {
      throw new Error('没有可用的视频片段')
    }

    // 步骤 2: 🔥 直接拼接视频片段（无转场）
    const concatenatedPath = path.join(tempDir, 'concatenated.mp4')
    console.log('[VideoComposer] 拼接视频片段（无转场）...')
    await simpleConcatVideos(
      clips.map((clip, index) => ({
        ...clip,
        local_path: localPaths[index]
      })),
      concatenatedPath
    )

    // 步骤 3: 添加背景音乐（如有）
    let finalPath = concatenatedPath
    if (music && music.url) {
      console.log('[VideoComposer] 添加背景音乐...')
      const musicPath = path.join(tempDir, 'background_music.mp3')

      // 下载音乐
      await downloadVideo(music.url, musicPath)

      // 计算视频总时长（用于正确的 fadeOut）
      const totalDuration = estimateTotalDuration(clips, {
        type: 'none',
        duration: 0
      })

      // 添加音乐
      finalPath = path.join(tempDir, 'final_with_music.mp4')
      await addBackgroundMusic(
        concatenatedPath,
        musicPath,
        finalPath,
        music,
        totalDuration
      )
    }

    // 步骤 4: 复制到最终输出路径（如果需要）
    if (finalPath !== outputPath) {
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.copyFileSync(finalPath, outputPath)
      console.log('[VideoComposer] 视频已复制到:', outputPath)
    }

    console.log('[VideoComposer] 视频合成完成 ✓', {
      outputPath,
      fileSize: (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2) + ' MB'
    })

    return outputPath

  } finally {
    // 步骤 5: 清理临时文件（保留最终输出）
    console.log('[VideoComposer] 清理临时文件...')
    const tempFiles = fs.readdirSync(tempDir)
    for (const file of tempFiles) {
      const filePath = path.join(tempDir, file)
      if (filePath !== outputPath && fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath)
      }
    }
  }
}

/**
 * Video Agent - FFmpeg 视频合成服务
 * 视频拼接、转场特效、音乐混音
 */

import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'
import fetch from 'node-fetch'

const streamPipeline = promisify(pipeline)

export interface VideoClip {
  shot_number: number
  video_url: string
  duration: number
  local_path?: string
}

export interface TransitionConfig {
  type: 'fade' | 'crossfade' | 'slide' | 'zoom'
  duration: number  // 转场时长(秒)
}

export interface MusicConfig {
  url: string
  volume?: number  // 音量 0.0-1.0
  fadeIn?: number  // 淡入时长(秒)
  fadeOut?: number  // 淡出时长(秒)
}

export interface VideoCompositionOptions {
  clips: VideoClip[]
  music?: MusicConfig
  transition?: TransitionConfig
  outputPath: string
  resolution?: '480p' | '720p' | '1080p'
  fps?: number
}

/**
 * 下载视频文件到本地临时目录
 * @param url 视频 URL
 * @param outputPath 本地保存路径
 */
export async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`[VideoComposer] 正在下载视频: ${url}`)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`下载视频失败: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('响应体为空')
  }

  // 确保目录存在
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // 下载到本地
  await streamPipeline(response.body, fs.createWriteStream(outputPath))

  console.log(`[VideoComposer] 视频下载完成: ${outputPath}`)
}

/**
 * 批量下载视频片段
 * @param clips 视频片段列表
 * @param tempDir 临时目录
 * @returns 带有本地路径的视频片段列表
 */
export async function downloadAllClips(
  clips: VideoClip[],
  tempDir: string = '/tmp/video-agent'
): Promise<VideoClip[]> {
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  console.log(`[VideoComposer] 正在下载 ${clips.length} 个视频片段到 ${tempDir}`)

  const tasks = clips.map(async (clip, index) => {
    const localPath = path.join(tempDir, `clip_${clip.shot_number.toString().padStart(2, '0')}.mp4`)

    try {
      await downloadVideo(clip.video_url, localPath)

      return {
        ...clip,
        local_path: localPath
      }
    } catch (error: any) {
      console.error(`[VideoComposer] 下载片段 ${clip.shot_number} 失败:`, error)
      throw new Error(`片段 ${clip.shot_number} 下载失败: ${error.message}`)
    }
  })

  return await Promise.all(tasks)
}

/**
 * 生成 FFmpeg concat 文件列表
 * @param clips 带有本地路径的视频片段列表
 * @param outputPath 输出文件路径
 */
export function generateConcatFile(clips: VideoClip[], outputPath: string): void {
  const content = clips
    .map(clip => `file '${clip.local_path}'`)
    .join('\n')

  fs.writeFileSync(outputPath, content, 'utf-8')

  console.log(`[VideoComposer] Concat 文件已生成: ${outputPath}`)
}

/**
 * 构建 FFmpeg 转场滤镜
 * @param clipCount 视频片段数量
 * @param transition 转场配置
 * @returns FFmpeg 滤镜字符串
 */
export function buildTransitionFilter(
  clipCount: number,
  transition: TransitionConfig
): string {
  const { type, duration } = transition

  switch (type) {
    case 'fade':
      // 淡入淡出效果
      return `fade=t=in:st=0:d=${duration},fade=t=out:st=${duration}:d=${duration}`

    case 'crossfade':
      // 交叉溶解 - 需要复杂的滤镜链
      const xfadeFilters: string[] = []
      for (let i = 0; i < clipCount - 1; i++) {
        xfadeFilters.push(`[${i}:v][${i + 1}:v]xfade=transition=fade:duration=${duration}:offset=${i * 5}[v${i}]`)
      }
      return xfadeFilters.join(';')

    case 'slide':
      // 滑动切换
      return `xfade=transition=slideleft:duration=${duration}`

    case 'zoom':
      // 缩放切换
      return `xfade=transition=zoomin:duration=${duration}`

    default:
      return ''
  }
}

/**
 * 获取视频分辨率参数
 * @param resolution 分辨率字符串
 * @returns FFmpeg 分辨率参数
 */
export function getResolutionParams(resolution: string): { width: number; height: number } {
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 }
  }

  return resolutionMap[resolution] || resolutionMap['1080p']
}

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
    resolution = '1080p',
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
 * 清理临时文件
 * @param tempDir 临时目录
 */
export function cleanupTempFiles(tempDir: string = '/tmp/video-agent'): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    console.log(`[VideoComposer] 临时文件已清理: ${tempDir}`)
  }
}

/**
 * 估算合成后的视频时长
 * @param clips 视频片段列表
 * @param transition 转场配置
 * @returns 总时长(秒)
 */
export function estimateTotalDuration(
  clips: VideoClip[],
  transition?: TransitionConfig
): number {
  const clipsDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)

  // 如果有转场,需要减去重叠的时间
  if (transition && clips.length > 1) {
    const transitionOverlap = transition.duration * (clips.length - 1)
    return clipsDuration - transitionOverlap
  }

  return clipsDuration
}

/**
 * 🔥 使用 xfade 合成视频（带交叉淡化）
 *
 * @param clips 视频片段列表
 * @param outputPath 输出文件路径
 * @param music 背景音乐配置（可选）
 * @param transitionDuration 过渡时长（秒），默认 0.5
 * @param segmentDuration 每个片段时长（秒），默认 5
 * @returns 输出文件路径
 */
export async function composeVideoWithCrossfade(
  clips: VideoClip[],
  outputPath: string,
  music?: MusicConfig,
  transitionDuration: number = 0.5,
  segmentDuration: number = 5
): Promise<string> {
  const { concatenateWithCrossfadeAndAudio, addBackgroundMusic } = await import('./ffmpeg-executor')

  console.log('[VideoComposer] 🔥 开始视频合成（交叉淡化）', {
    clipCount: clips.length,
    hasMusic: !!music,
    transitionDuration,
    segmentDuration
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

    // 步骤 2: 🔥 使用交叉淡化拼接视频
    console.log('[VideoComposer] 拼接视频片段（交叉淡化）...')
    const concatenatedPath = path.join(tempDir, 'concatenated.mp4')
    await concatenateWithCrossfadeAndAudio(
      localPaths,
      concatenatedPath,
      transitionDuration,
      segmentDuration
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
        type: 'crossfade',
        duration: transitionDuration
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

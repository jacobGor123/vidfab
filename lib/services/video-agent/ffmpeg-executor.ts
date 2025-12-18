/**
 * Video Agent - FFmpeg 命令执行器
 * 使用 fluent-ffmpeg 实际执行视频合成
 *
 * 注意:
 * 1. 需要安装 fluent-ffmpeg: npm install fluent-ffmpeg @types/fluent-ffmpeg
 * 2. 需要在服务器上安装 FFmpeg 可执行文件
 * 3. 此文件仅在 Node.js 服务器环境中使用,不支持 Edge Runtime
 */

import { VideoClip, TransitionConfig, MusicConfig } from './video-composer'

// 类型定义 - 避免直接导入 fluent-ffmpeg(可能在某些环境中不可用)
type FfmpegCommand = any

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
    console.error('[FFmpegExecutor] FFmpeg 未安装或不可用:', error)
    return false
  }
}

/**
 * 简单拼接视频(无转场)
 * @param clips 视频片段列表(带本地路径)
 * @param outputPath 输出文件路径
 * @returns 执行结果
 */
export async function simpleConcatVideos(
  clips: VideoClip[],
  outputPath: string
): Promise<void> {
  // 动态导入 fluent-ffmpeg
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

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
        console.log('[FFmpegExecutor] 开始拼接视频:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 视频拼接完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 视频拼接失败:', err)
        reject(err)
      })
      .mergeToFile(outputPath, '/tmp/video-agent')
  })
}

/**
 * 添加背景音乐
 * @param videoPath 输入视频路径
 * @param musicPath 音乐文件路径
 * @param outputPath 输出文件路径
 * @param musicConfig 音乐配置
 * @param videoDuration 视频总时长(秒)，用于正确计算 fadeOut 的开始时间
 * @returns 执行结果
 */
export async function addBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  musicConfig?: MusicConfig,
  videoDuration?: number
): Promise<void> {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

  const volume = musicConfig?.volume ?? 0.3  // 默认音量 30%

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(videoPath)
      .input(musicPath)

    // 设置音频滤镜
    const audioFilters: string[] = []

    // 音量调整
    audioFilters.push(`volume=${volume}`)

    // 淡入淡出效果
    if (musicConfig?.fadeIn) {
      audioFilters.push(`afade=t=in:st=0:d=${musicConfig.fadeIn}`)
    }

    if (musicConfig?.fadeOut && videoDuration) {
      // 正确计算 fadeOut 的开始时间：从结尾往前推 fadeOut 秒
      const fadeOutStart = Math.max(0, videoDuration - musicConfig.fadeOut)
      audioFilters.push(`afade=t=out:st=${fadeOutStart}:d=${musicConfig.fadeOut}`)
      console.log(`[FFmpegExecutor] FadeOut 配置: 从第 ${fadeOutStart} 秒开始淡出，持续 ${musicConfig.fadeOut} 秒`)
    }

    // 注意：原始视频可能没有音频流（因为使用 concat=n=5:v=1:a=0）
    // 因此我们直接使用音乐作为音频流，不尝试混合
    command
      .complexFilter([
        `[1:a]${audioFilters.join(',')}[audio]`
      ])
      .outputOptions([
        '-map 0:v',           // 使用第一个输入的视频流
        '-map [audio]',       // 使用处理后的音乐流作为音频
        '-c:v copy',          // 视频流直接复制(不重新编码)
        '-c:a aac',           // 音频编码为 AAC
        '-shortest'           // 以最短流为准
      ])
      .on('start', (commandLine: string) => {
        console.log('[FFmpegExecutor] 开始添加背景音乐:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 背景音乐添加完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 添加背景音乐失败:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 完整的视频合成流程
 * @param clips 视频片段列表
 * @param outputPath 最终输出路径
 * @param musicPath 背景音乐路径(可选)
 * @param musicConfig 音乐配置(可选)
 * @returns 执行结果
 */
export async function composeFullVideo(
  clips: VideoClip[],
  outputPath: string,
  musicPath?: string,
  musicConfig?: MusicConfig
): Promise<void> {
  console.log('[FFmpegExecutor] 开始完整视频合成', {
    clipCount: clips.length,
    hasMusic: !!musicPath,
    outputPath
  })

  // 步骤 1: 检查 FFmpeg 是否可用
  const ffmpegAvailable = await checkFfmpegAvailable()
  if (!ffmpegAvailable) {
    throw new Error(
      'FFmpeg 不可用。请在服务器上安装 FFmpeg。\n' +
      '安装指南: https://ffmpeg.org/download.html'
    )
  }

  // 步骤 2: 简单拼接视频
  const tempVideoPath = '/tmp/video-agent/concatenated.mp4'
  await simpleConcatVideos(clips, tempVideoPath)

  // 步骤 3: 添加背景音乐(如果有)
  if (musicPath) {
    await addBackgroundMusic(tempVideoPath, musicPath, outputPath, musicConfig)
  } else {
    // 如果没有音乐,直接使用拼接后的视频
    const fs = await import('fs')
    fs.default.copyFileSync(tempVideoPath, outputPath)
  }

  console.log('[FFmpegExecutor] 视频合成完成:', outputPath)
}

/**
 * 添加淡入淡出转场效果
 * 注意: 这是一个简化版本,复杂的转场需要使用 xfade 滤镜
 *
 * @param clips 视频片段列表
 * @param outputPath 输出路径
 * @param transitionDuration 转场时长(秒)
 * @returns 执行结果
 */
export async function addFadeTransitions(
  clips: VideoClip[],
  outputPath: string,
  transitionDuration: number = 0.5
): Promise<void> {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

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
        '-preset medium',
        '-crf 23'
      ])
      .on('start', (commandLine: string) => {
        console.log('[FFmpegExecutor] 开始添加转场效果:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 转场效果添加完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 添加转场效果失败:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 🔥 使用 xfade 滤镜拼接视频（带交叉淡化）
 *
 * @param videoPaths 视频文件路径列表（本地路径）
 * @param outputPath 输出文件路径
 * @param transitionDuration 过渡时长（秒），默认 0.5
 * @param segmentDuration 每个片段时长（秒），默认 5（用于计算偏移）
 */
export async function concatenateWithCrossfadeAndAudio(
  videoPaths: string[],
  outputPath: string,
  transitionDuration: number = 0.5,
  segmentDuration: number = 5
): Promise<void> {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

  if (videoPaths.length === 0) {
    throw new Error('视频列表为空')
  }

  // 单个视频直接复制
  if (videoPaths.length === 1) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPaths[0])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  // 🔥 构建视频 xfade 滤镜链
  let videoFilterComplex = ''
  let previousVideoOutput = '[0:v]'

  for (let i = 1; i < videoPaths.length; i++) {
    const currentVideoInput = `[${i}:v]`
    const currentVideoOutput = i === videoPaths.length - 1 ? '[outv]' : `[v${i}]`

    // 计算偏移时间（上一个视频的时长 - 过渡时长）
    // 例如：5 秒片段，0.5 秒过渡 → offset = 4.5, 9.5, 14.5...
    const offset = (segmentDuration - transitionDuration) * i - transitionDuration * (i - 1)

    videoFilterComplex += `${previousVideoOutput}${currentVideoInput}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${currentVideoOutput};`
    previousVideoOutput = currentVideoOutput
  }

  // 🔥 构建音频 concat 滤镜（简单拼接）
  let audioFilterComplex = ''
  for (let i = 0; i < videoPaths.length; i++) {
    audioFilterComplex += `[${i}:a]`
  }
  audioFilterComplex += `concat=n=${videoPaths.length}:v=0:a=1[outa]`

  // 组合视频和音频滤镜
  const filterComplex = videoFilterComplex.slice(0, -1) + ';' + audioFilterComplex

  console.log('[FFmpegExecutor] xfade 滤镜链:', filterComplex)

  return new Promise((resolve, reject) => {
    let command = ffmpeg()

    // 添加所有输入文件
    videoPaths.forEach(videoPath => {
      command = command.input(videoPath)
    })

    command
      .complexFilter(filterComplex)
      .map('[outv]')   // 视频流
      .map('[outa]')   // 音频流
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset medium',
        '-crf 23',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[FFmpegExecutor] 开始拼接（交叉淡化）:', cmd)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 拼接完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 拼接失败:', err)
        reject(err)
      })
      .run()
  })
}

/**
 * 🔥 为视频添加字幕（烧录到视频中）
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
  }
): Promise<void> {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

  // 默认字幕样式（白色字体，黑色描边，底部居中）
  const fontName = options?.fontName || 'Arial'
  const fontSize = options?.fontSize || 18  // 🔥 降低默认字号（从 24 改为 18）
  const primaryColor = options?.primaryColor || '&HFFFFFF'  // 白色
  const outlineColor = options?.outlineColor || '&H000000'  // 黑色
  const outline = options?.outline || 2
  const shadow = options?.shadow || 1
  const alignment = options?.alignment || 2  // 底部居中

  // 构建字幕样式字符串
  const subtitleStyle = [
    `FontName=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColor}`,
    `OutlineColour=${outlineColor}`,
    `BorderStyle=1`,
    `Outline=${outline}`,
    `Shadow=${shadow}`,
    `Alignment=${alignment}`
  ].join(',')

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .outputOptions([
        `-vf subtitles=${srtPath}:force_style='${subtitleStyle}'`
      ])
      .videoCodec('libx264')
      .audioCodec('copy')  // 保留原音频
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[FFmpegExecutor] 添加字幕:', cmd)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 字幕渲染进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 字幕添加完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 添加字幕失败:', err)
        reject(err)
      })
      .run()
  })
}

/**
 * 将音频添加到视频
 * @param videoPath 输入视频路径
 * @param audioPath 输入音频路径
 * @param outputPath 输出视频路径
 * @param options 音频选项（音量等）
 */
export async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  options: {
    volume?: number  // 音量（0.0-1.0，默认 1.0）
    fadeIn?: number  // 淡入时长（秒）
    fadeOut?: number // 淡出时长（秒）
  } = {}
): Promise<void> {
  const ffmpegModule = await import('fluent-ffmpeg')
  const ffmpeg = ffmpegModule.default

  const volume = options.volume ?? 1.0

  console.log('[FFmpegExecutor] 添加音频到视频:', {
    videoPath,
    audioPath,
    outputPath,
    volume
  })

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(videoPath)
      .input(audioPath)

    // 构建音频滤镜
    let audioFilter = `[1:a]volume=${volume}`

    if (options.fadeIn) {
      audioFilter += `,afade=t=in:st=0:d=${options.fadeIn}`
    }

    if (options.fadeOut) {
      // 注意：淡出需要知道音频总时长，这里简化处理
      audioFilter += `,afade=t=out:st=0:d=${options.fadeOut}`
    }

    audioFilter += '[audio]'

    command
      .complexFilter([audioFilter])
      .outputOptions([
        '-map 0:v',          // 使用第一个输入的视频流
        '-map [audio]',      // 使用处理后的音频
        '-c:v copy',         // 视频流直接复制（不重新编码）
        '-c:a aac',          // 音频编码为 AAC
        '-shortest'          // 以较短的流为准（避免视频/音频不同步）
      ])
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[FFmpegExecutor] FFmpeg命令:', cmd)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[FFmpegExecutor] 音频添加进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpegExecutor] 音频添加完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[FFmpegExecutor] 添加音频失败:', err)
        reject(err)
      })
      .run()
  })
}

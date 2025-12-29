/**
 * Audio Processor - 音频处理器
 * 提供背景音乐、静音轨道、音频添加等功能
 */

import { MusicConfig } from '../../video-composer'

/**
 * 添加背景音乐
 * @param videoPath 输入视频路径
 * @param musicPath 音乐文件路径
 * @param outputPath 输出文件路径
 * @param musicConfig 音乐配置
 * @param videoDuration 视频总时长（秒），用于正确计算 fadeOut 的开始时间
 * @returns 执行结果
 */
export async function addBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  musicConfig?: MusicConfig,
  videoDuration?: number
): Promise<void> {
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()

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
      console.log(`[AudioProcessor] FadeOut 配置: 从第 ${fadeOutStart} 秒开始淡出，持续 ${musicConfig.fadeOut} 秒`)
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
        '-c:v copy',          // 视频流直接复制（不重新编码）
        '-c:a aac',           // 音频编码为 AAC
        '-shortest'           // 以最短流为准
      ])
      .on('start', (commandLine: string) => {
        console.log('[AudioProcessor] 开始添加背景音乐:', commandLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[AudioProcessor] 进度: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('end', () => {
        console.log('[AudioProcessor] 背景音乐添加完成:', outputPath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[AudioProcessor] 添加背景音乐失败:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 为视频添加静音音频轨道
 * @param videoPath 输入视频路径（无音频）
 * @param outputPath 输出视频路径
 */
export async function addSilentAudioTrack(
  videoPath: string,
  outputPath: string
): Promise<void> {
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .complexFilter([
        'anullsrc=channel_layout=stereo:sample_rate=44100[silent]'
      ])
      .outputOptions([
        '-map 0:v',      // 映射视频流
        '-map [silent]', // 映射静音音频流
        '-c:v copy',     // 视频流直接复制
        '-c:a aac',      // 音频编码为 AAC
        '-shortest'      // 以视频长度为准
      ])
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[AudioProcessor] 添加静音音频轨道:', cmd)
      })
      .on('end', () => {
        console.log('[AudioProcessor] 静音音频轨道添加完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[AudioProcessor] 添加静音音频失败:', err)
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
  // 🔥 使用配置好的 fluent-ffmpeg（包含 FFmpeg 二进制路径）
  const { setupFfmpeg } = await import('./ffmpeg-setup')
  const ffmpeg = await setupFfmpeg()
  const fs = await import('fs')

  const volume = options.volume ?? 1.0

  console.log('[AudioProcessor] 添加音频到视频:', {
    videoPath,
    audioPath,
    outputPath,
    volume
  })

  // 检查文件是否存在
  const videoExists = fs.default.existsSync(videoPath)
  const audioExists = fs.default.existsSync(audioPath)

  console.log('[AudioProcessor] 文件检查:', {
    videoExists,
    audioExists,
    videoPath,
    audioPath
  })

  if (!videoExists) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }

  if (!audioExists) {
    throw new Error(`音频文件不存在: ${audioPath}`)
  }

  // 使用 ffprobe 检查视频流信息
  try {
    const videoMetadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err)
        else resolve(metadata)
      })
    })

    const audioMetadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err)
        else resolve(metadata)
      })
    })

    console.log('[AudioProcessor] 视频流信息:', {
      format: videoMetadata.format?.format_name,
      duration: videoMetadata.format?.duration,
      hasVideo: videoMetadata.streams?.some((s: any) => s.codec_type === 'video'),
      hasAudio: videoMetadata.streams?.some((s: any) => s.codec_type === 'audio'),
      videoCodec: videoMetadata.streams?.find((s: any) => s.codec_type === 'video')?.codec_name,
      audioCodec: videoMetadata.streams?.find((s: any) => s.codec_type === 'audio')?.codec_name
    })

    console.log('[AudioProcessor] 音频流信息:', {
      format: audioMetadata.format?.format_name,
      duration: audioMetadata.format?.duration,
      hasAudio: audioMetadata.streams?.some((s: any) => s.codec_type === 'audio'),
      audioCodec: audioMetadata.streams?.find((s: any) => s.codec_type === 'audio')?.codec_name
    })
  } catch (probeError) {
    console.error('[AudioProcessor] ffprobe 检查失败:', probeError)
    throw new Error(`无法读取媒体文件信息: ${probeError}`)
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(videoPath)
      .input(audioPath)

    // 假设视频没有音频流（Veo 3.1 的 generate_audio: false）
    // 直接使用外部音频文件，不需要复杂滤镜
    const audioFilter = `volume=${volume},apad`

    command
      .outputOptions([
        '-y',                // 强制覆盖输出文件
        '-map 0:v',          // 使用第一个输入的视频流
        '-map 1:a',          // 使用第二个输入的音频流（旁白音频文件）
        '-c:v copy',         // 视频流直接复制（不重新编码）
        '-c:a aac',          // 音频编码为 AAC
        `-filter:a ${audioFilter}`,  // 设置音量 + 填充静音到视频长度
        '-shortest'          // 保留 shortest（现在音频会自动填充到视频长度）
      ])
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[AudioProcessor] FFmpeg 完整命令:', cmd)
      })
      .on('stderr', (stderrLine: string) => {
        console.log('[AudioProcessor] FFmpeg stderr:', stderrLine)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[AudioProcessor] 音频添加进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[AudioProcessor] 音频添加完成 ✓')
        resolve()
      })
      .on('error', (err: Error, stdout: string, stderr: string) => {
        console.error('[AudioProcessor] 添加音频失败!')
        console.error('[AudioProcessor] 错误:', err.message)
        console.error('[AudioProcessor] stdout:', stdout)
        console.error('[AudioProcessor] stderr:', stderr)
        reject(err)
      })
      .run()
  })
}

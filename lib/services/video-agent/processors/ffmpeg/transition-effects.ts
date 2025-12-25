/**
 * Transition Effects - 转场效果处理器
 * 使用 xfade 滤镜实现高级转场效果
 */

import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

/**
 * 检测视频是否有音频流
 */
async function hasAudioStream(videoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${videoPath}"`
    )
    return stdout.trim() === 'audio'
  } catch (error) {
    console.warn(`[TransitionEffects] Failed to probe audio stream for ${videoPath}:`, error)
    return false
  }
}

/**
 * 使用 xfade 滤镜拼接视频（带交叉淡化）
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

  // 🔥 检测所有视频是否有音频流
  const audioChecks = await Promise.all(videoPaths.map(hasAudioStream))
  const allHaveAudio = audioChecks.every(has => has)
  const someHaveAudio = audioChecks.some(has => has)

  console.log('[TransitionEffects] Audio stream detection:', {
    total: videoPaths.length,
    withAudio: audioChecks.filter(has => has).length,
    allHaveAudio,
    someHaveAudio
  })

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

  // 构建视频 xfade 滤镜链
  let videoFilterComplex = ''
  let previousVideoOutput = '[0:v]'

  for (let i = 1; i < videoPaths.length; i++) {
    const currentVideoInput = `[${i}:v]`
    const currentVideoOutput = i === videoPaths.length - 1 ? '[outv]' : `[v${i}]`

    const offset = (segmentDuration - transitionDuration) * i

    videoFilterComplex += `${previousVideoOutput}${currentVideoInput}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${currentVideoOutput};`
    previousVideoOutput = currentVideoOutput
  }

  // 🔥 只有当所有视频都有音频时，才拼接音频
  let filterComplex = videoFilterComplex
  if (allHaveAudio) {
    // 构建音频 concat 滤镜（使用视频自带的音频，保留旁白）
    let audioFilterComplex = ''
    for (let i = 0; i < videoPaths.length; i++) {
      audioFilterComplex += `[${i}:a]`
    }
    audioFilterComplex += `concat=n=${videoPaths.length}:v=0:a=1[outa]`
    filterComplex = videoFilterComplex + audioFilterComplex
    console.log('[TransitionEffects] xfade 滤镜链（含音频）:', filterComplex)
  } else {
    console.log('[TransitionEffects] xfade 滤镜链（仅视频，无音频）:', filterComplex)
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg()

    // 添加所有输入文件
    videoPaths.forEach(videoPath => {
      command = command.input(videoPath)
    })

    // 应用滤镜
    command.complexFilter(filterComplex)

    // 🔥 视频流必须 map
    command.map('[outv]')

    // 🔥 音频流只在所有视频都有音频时才 map
    if (allHaveAudio) {
      command.map('[outa]')
      command.audioCodec('aac')
    } else {
      // 无音频时，显式禁用音频
      command.outputOptions(['-an'])
    }

    command
      .videoCodec('libx264')
      .outputOptions([
        '-preset veryfast',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-threads 0'
      ])
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[TransitionEffects] 开始拼接（交叉淡化）:', cmd)
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[TransitionEffects] 进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[TransitionEffects] 拼接完成 ✓')
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('[TransitionEffects] 拼接失败:', err)
        reject(err)
      })
      .run()
  })
}

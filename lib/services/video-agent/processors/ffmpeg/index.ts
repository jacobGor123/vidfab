/**
 * FFmpeg Processors - 统一导出
 * 保持向后兼容性，所有原有的导入路径都可以正常使用
 */

// FFmpeg 检查
export { checkFfmpegAvailable } from './ffmpeg-checker'

// 视频拼接
export { simpleConcatVideos, addFadeTransitions } from './video-concat'

// 音频处理
export {
  addBackgroundMusic,
  addSilentAudioTrack,
  addAudioToVideo
} from './audio-processor'

// 字幕处理
export { addSubtitlesToVideo } from './subtitle-processor'

// 转场效果
export { concatenateWithCrossfadeAndAudio } from './transition-effects'

// 完整视频合成流程
import { VideoClip, MusicConfig } from '../../video-composer'
import { checkFfmpegAvailable } from './ffmpeg-checker'
import { simpleConcatVideos } from './video-concat'
import { addBackgroundMusic } from './audio-processor'

/**
 * 完整的视频合成流程
 * @param clips 视频片段列表
 * @param outputPath 最终输出路径
 * @param musicPath 背景音乐路径（可选）
 * @param musicConfig 音乐配置（可选）
 * @returns 执行结果
 */
export async function composeFullVideo(
  clips: VideoClip[],
  outputPath: string,
  musicPath?: string,
  musicConfig?: MusicConfig
): Promise<void> {
  console.log('[FFmpegProcessor] 开始完整视频合成', {
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

  // 步骤 3: 添加背景音乐（如果有）
  if (musicPath) {
    await addBackgroundMusic(tempVideoPath, musicPath, outputPath, musicConfig)
  } else {
    // 如果没有音乐，直接使用拼接后的视频
    const fs = await import('fs')
    fs.default.copyFileSync(tempVideoPath, outputPath)
  }

  console.log('[FFmpegProcessor] 视频合成完成:', outputPath)
}

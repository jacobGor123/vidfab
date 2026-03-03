/**
 * Shotstack Video Composer
 * 使用 Shotstack API 进行云端视频合成
 * 文档: https://shotstack.io/docs/guide/getting-started/core-concepts/
 */

import { parseSRTFromURL } from './srt-parser'

interface ShotstackClip {
  asset: {
    type: 'video'
    src: string
  }
  start: number
  length: number
}

interface ShotstackTimeline {
  soundtrack?: {
    src: string
    effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut'
    volume?: number
  }
  tracks: Array<{
    clips: ShotstackClip[]
  }>
}

interface ShotstackRenderRequest {
  timeline: ShotstackTimeline
  output: {
    format: 'mp4'
    resolution: 'hd' | 'sd' | '1080'
    aspectRatio?: '16:9' | '9:16'
  }
}


/**
 * Shotstack 视频元数据
 */
export interface VideoMetadata {
  url: string
  fileSize: number      // 文件大小（字节）
  resolution: string    // 分辨率，如 "1920x1080"
  duration: number      // 时长（秒）
}

/**
 * 使用 Shotstack API 拼接视频
 */
export async function concatenateVideosWithShotstack(
  videoUrls: string[],
  options: {
    aspectRatio?: '16:9' | '9:16'
    clipDurations?: number[] // 每个片段的时长（秒）
    backgroundMusicUrl?: string
    subtitleUrl?: string
  } = {}
): Promise<VideoMetadata> {
  const apiKey = process.env.SHOTSTACK_API_KEY
  const apiUrl = process.env.SHOTSTACK_API_URL || 'https://api.shotstack.io/edit/v1'

  if (!apiKey) {
    throw new Error('SHOTSTACK_API_KEY environment variable is required')
  }

  console.log('[Shotstack] 🎬 开始拼接视频', {
    videoCount: videoUrls.length,
    aspectRatio: options.aspectRatio || '16:9'
  })

  // 构建 Shotstack 时间轴
  const clips: ShotstackClip[] = []
  let currentTime = 0

  for (let i = 0; i < videoUrls.length; i++) {
    const duration = options.clipDurations?.[i] || 5 // 默认 5 秒

    clips.push({
      asset: {
        type: 'video',
        src: videoUrls[i]
      },
      start: currentTime,
      length: duration
    })

    currentTime += duration
  }

  // 构建时间轴
  const timeline: ShotstackTimeline = {
    tracks: [
      {
        clips
      }
    ]
  }

  // 🎵 添加背景音乐
  if (options.backgroundMusicUrl) {
    console.log('[Shotstack] 🎵 添加背景音乐:', options.backgroundMusicUrl)
    timeline.soundtrack = {
      src: options.backgroundMusicUrl,
      effect: 'fadeInFadeOut',
      volume: 0.3 // 背景音乐音量 30%
    }
  }

  // 📝 添加字幕轨道（如果有 SRT 文件）
  if (options.subtitleUrl) {
    console.log('[Shotstack] 📝 解析 SRT 字幕:', options.subtitleUrl)

    try {
      // 1. 解析 SRT 文件
      const subtitles = await parseSRTFromURL(options.subtitleUrl)

      // 2. 为每条字幕创建一个 title clip
      const subtitleClips = subtitles.map(sub => ({
        asset: {
          type: 'title' as any,
          text: sub.text,
          style: 'minimal' as any,      // 🎨 改用 minimal 风格（现代简约）
          color: '#ffffff',
          size: 'medium' as any,         // 🔥 调大字号，避免截断
          background: '#000000',
          position: 'bottom' as any,
          offset: {
            y: -0.35
          }
        },
        start: sub.startTime,
        length: sub.endTime - sub.startTime
      }))

      // 3. 添加字幕轨道
      timeline.tracks.push({
        clips: subtitleClips as any
      })

      console.log('[Shotstack] ✅ 已添加', subtitles.length, '条字幕')
    } catch (error: any) {
      console.error('[Shotstack] ❌ 字幕解析失败:', error.message)
      // 字幕失败不影响视频合成，继续执行
    }
  }

  const renderRequest: ShotstackRenderRequest = {
    timeline,
    output: {
      format: 'mp4',
      resolution: '1080',
      aspectRatio: options.aspectRatio || '16:9'
    }
  }

  try {
    // 步骤 1: 提交渲染任务
    console.log('[Shotstack] 📤 提交渲染任务...')
    const renderResponse = await fetch(`${apiUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(renderRequest)
    })

    if (!renderResponse.ok) {
      const error = await renderResponse.text()
      throw new Error(`Shotstack render failed: ${error}`)
    }

    const renderData = await renderResponse.json()
    const renderId = renderData.response?.id

    if (!renderId) {
      throw new Error('No render ID returned from Shotstack')
    }

    console.log('[Shotstack] ✅ 渲染任务已提交:', renderId)

    // 步骤 2: 轮询渲染状态
    console.log('[Shotstack] ⏳ 等待渲染完成...')
    const metadata = await pollRenderStatus(apiUrl, apiKey, renderId)

    console.log('[Shotstack] ✅ 视频合成完成:', metadata)
    return metadata

  } catch (error: any) {
    console.error('[Shotstack] ❌ 视频合成失败:', error.message)
    throw new Error(`Shotstack composition failed: ${error.message}`)
  }
}

/**
 * 轮询渲染状态
 */
async function pollRenderStatus(
  apiUrl: string,
  apiKey: string,
  renderId: string,
  maxAttempts: number = 60, // 最多等待 5 分钟（每 5 秒检查一次）
  intervalMs: number = 5000
): Promise<VideoMetadata> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`${apiUrl}/render/${renderId}`, {
        headers: {
          'x-api-key': apiKey
        }
      })

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.response?.status
      const url = statusData.response?.url
      const size = statusData.response?.size
      const width = statusData.response?.width
      const height = statusData.response?.height
      const duration = statusData.response?.duration

      console.log(`[Shotstack] 📊 渲染进度 (${attempt}/${maxAttempts}):`, status)

      if (status === 'done' && url) {
        return {
          url,
          fileSize: size || 0,
          resolution: width && height ? `${width}x${height}` : '1920x1080',
          duration: duration || 0
        }
      }

      if (status === 'failed') {
        const error = statusData.response?.error || 'Unknown error'
        throw new Error(`Render failed: ${error}`)
      }

      // 继续等待
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }

    } catch (error: any) {
      console.error(`[Shotstack] ⚠️ 状态检查失败 (attempt ${attempt}):`, error.message)

      if (attempt === maxAttempts) {
        throw error
      }

      // 重试
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  throw new Error(`Render timeout after ${maxAttempts} attempts`)
}

/**
 * 🗑️ 已废弃：音频现在通过 soundtrack 属性在 concatenateVideosWithShotstack 中添加
 * 保留此函数以防万一需要独立添加音频的场景
 */
export async function addAudioToVideoWithShotstack(
  videoUrl: string,
  audioUrl: string,
  options: {
    audioVolume?: number
    videoDuration?: number
  } = {}
): Promise<VideoMetadata> {
  console.warn('[Shotstack] ⚠️ addAudioToVideoWithShotstack is deprecated. Use backgroundMusicUrl in concatenateVideosWithShotstack instead.')

  // 直接调用 concatenateVideosWithShotstack
  return concatenateVideosWithShotstack([videoUrl], {
    backgroundMusicUrl: audioUrl,
    clipDurations: [options.videoDuration || 30]
  })
}

/**
 * Shotstack Video Composer
 * 使用 Shotstack API 进行云端视频合成
 * 文档: https://shotstack.io/docs/guide/getting-started/core-concepts/
 */

interface ShotstackClip {
  asset: {
    type: 'video'
    src: string
  }
  start: number
  length: number
  transition?: {
    in?: 'fade' | 'fadeSlow' | 'fadeFast' | 'reveal' | 'wipeLeft' | 'slideLeft'
    out?: 'fade' | 'fadeSlow' | 'fadeFast' | 'reveal' | 'wipeRight' | 'slideRight'
  }
}

interface ShotstackTimeline {
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
 * 使用 Shotstack API 拼接视频
 */
export async function concatenateVideosWithShotstack(
  videoUrls: string[],
  options: {
    aspectRatio?: '16:9' | '9:16'
    clipDurations?: number[] // 每个片段的时长（秒）
  } = {}
): Promise<string> {
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
      length: duration,
      // 添加淡入淡出过渡效果
      transition: {
        in: 'fade',
        out: 'fade'
      }
    })

    currentTime += duration
  }

  const renderRequest: ShotstackRenderRequest = {
    timeline: {
      tracks: [
        {
          clips
        }
      ]
    },
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
    const videoUrl = await pollRenderStatus(apiUrl, apiKey, renderId)

    console.log('[Shotstack] ✅ 视频合成完成:', videoUrl)
    return videoUrl

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
): Promise<string> {
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

      console.log(`[Shotstack] 📊 渲染进度 (${attempt}/${maxAttempts}):`, {
        status,
        url,
        fullResponse: JSON.stringify(statusData)
      })

      if (status === 'done' && url) {
        return url
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
 * 添加音频到视频（使用 Shotstack）
 */
export async function addAudioToVideoWithShotstack(
  videoUrl: string,
  audioUrl: string,
  options: {
    audioVolume?: number // 0-1
    videoDuration?: number
  } = {}
): Promise<string> {
  const apiKey = process.env.SHOTSTACK_API_KEY
  const apiUrl = process.env.SHOTSTACK_API_URL || 'https://api.shotstack.io/edit/v1'

  if (!apiKey) {
    throw new Error('SHOTSTACK_API_KEY environment variable is required')
  }

  console.log('[Shotstack] 🎵 添加音频到视频...')

  const duration = options.videoDuration || 30

  const renderRequest = {
    timeline: {
      tracks: [
        // 视频轨道
        {
          clips: [
            {
              asset: {
                type: 'video',
                src: videoUrl
              },
              start: 0,
              length: duration
            }
          ]
        },
        // 音频轨道
        {
          clips: [
            {
              asset: {
                type: 'audio',
                src: audioUrl,
                volume: options.audioVolume || 1.0
              },
              start: 0,
              length: duration
            }
          ]
        }
      ]
    },
    output: {
      format: 'mp4',
      resolution: '1080'
    }
  }

  try {
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
      throw new Error('No render ID returned')
    }

    console.log('[Shotstack] ✅ 音频任务已提交:', renderId)

    const videoUrl = await pollRenderStatus(apiUrl, apiKey, renderId)
    console.log('[Shotstack] ✅ 音频添加完成:', videoUrl)
    return videoUrl

  } catch (error: any) {
    console.error('[Shotstack] ❌ 添加音频失败:', error.message)
    throw error
  }
}

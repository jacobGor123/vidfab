/**
 * Video Agent - Video Downloader
 * 视频文件下载服务
 */

import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'
import fetch from 'node-fetch'
import type { VideoClip } from '@/lib/types/video-agent'

const streamPipeline = promisify(pipeline)

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

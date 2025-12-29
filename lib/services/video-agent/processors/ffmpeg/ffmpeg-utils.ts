/**
 * FFmpeg Utils - FFmpeg 路径检测和执行工具
 * 参考 roomx-ai 项目的实现，支持 Vercel Serverless 环境
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 解析可用的 FFmpeg 路径
 */
function getNpmFFmpegPath(): string | null {
  try {
    // @ts-ignore 动态加载避免打包时报错
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    if (ffmpegInstaller?.path) return ffmpegInstaller.path
    return null
  } catch (error: any) {
    console.warn('[FFmpeg] Failed to load @ffmpeg-installer/ffmpeg:', error?.message)
    return null
  }
}

let cachedFFmpegPath: string | null = null

/**
 * 确保 FFmpeg 可用并返回路径
 */
export async function ensureFFmpegAvailable(): Promise<string> {
  if (cachedFFmpegPath) return cachedFFmpegPath

  const candidates: Array<{ path: string; source: string }> = []

  // 优先使用环境变量配置
  if (process.env.FFMPEG_PATH) {
    candidates.push({ path: process.env.FFMPEG_PATH, source: 'env FFMPEG_PATH' })
  }

  // 使用 @ffmpeg-installer/ffmpeg 提供的路径
  const npmPath = getNpmFFmpegPath()
  if (npmPath) {
    candidates.push({ path: npmPath, source: '@ffmpeg-installer/ffmpeg' })
  } else {
    console.warn('[FFmpeg] npm package not available, will try system ffmpeg')
  }

  // 最后尝试系统 PATH 中的 ffmpeg
  candidates.push({ path: 'ffmpeg', source: 'system PATH' })

  const errors: string[] = []
  for (const candidate of candidates) {
    try {
      await execAsync(`"${candidate.path}" -version`)
      cachedFFmpegPath = candidate.path
      console.log(`[FFmpeg] ✅ Using ${candidate.source}:`, candidate.path)
      return candidate.path
    } catch (error: any) {
      errors.push(`${candidate.source}: ${error?.message || 'unknown error'}`)
    }
  }

  throw new Error(`[FFmpeg] 无法找到可执行的 ffmpeg，尝试路径失败: ${errors.join(' | ')}`)
}

/**
 * 执行 FFmpeg 命令
 */
export async function runFFmpegCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  const ffmpegPath = await ensureFFmpegAvailable()
  const fullCommand = command.replace(/^ffmpeg/, `"${ffmpegPath}"`)

  console.log('[FFmpeg] Executing:', fullCommand)
  return await execAsync(fullCommand)
}

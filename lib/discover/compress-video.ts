/**
 * 视频压缩模块
 * 使用 ffmpeg 压缩视频到目标大小
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)

/**
 * 压缩配置
 */
export interface VideoCompressOptions {
  targetSizeMB?: number // 目标文件大小（MB），默认 1MB
  maxWidth?: number // 最大宽度，默认 1920（1080p）
  maxHeight?: number // 最大高度，默认 1080
  minBitrate?: number // 最低码率（kbps），默认 500
  fps?: number // 目标帧率，默认 30
  audioCodec?: string // 音频编码器，默认 'aac'
  audioBitrate?: string // 音频码率，默认 '128k'
}

/**
 * 压缩结果
 */
export interface VideoCompressResult {
  success: boolean
  buffer?: Buffer
  originalSize: number // 原始大小（bytes）
  compressedSize?: number // 压缩后大小（bytes）
  duration?: number // 视频时长（秒）
  bitrate?: number // 实际码率（kbps）
  width?: number // 输出宽度
  height?: number // 输出高度
  warning?: string // 警告信息
  error?: string
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<VideoCompressOptions> = {
  targetSizeMB: 1,
  maxWidth: 1920,
  maxHeight: 1080,
  minBitrate: 500, // 最低 500kbps
  fps: 30,
  audioCodec: 'aac',
  audioBitrate: '128k'
}

/**
 * 检查 ffmpeg 是否安装
 */
export async function checkFfmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version')
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取视频信息
 * @param inputPath 输入视频路径
 * @returns 视频信息（时长、宽度、高度、码率）
 */
async function getVideoInfo(inputPath: string): Promise<{
  duration: number
  width: number
  height: number
  bitrate: number
}> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration,bit_rate:stream=width,height -of json "${inputPath}"`
  )

  const info = JSON.parse(stdout)
  const stream = info.streams?.[0] || {}
  const format = info.format || {}

  return {
    duration: parseFloat(format.duration) || 0,
    width: stream.width || 0,
    height: stream.height || 0,
    bitrate: parseInt(format.bit_rate) / 1000 || 0 // 转换为 kbps
  }
}

/**
 * 压缩视频
 * @param input 输入视频（Buffer 或 Uint8Array）
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressVideo(
  input: Buffer | Uint8Array,
  options: VideoCompressOptions = {}
): Promise<VideoCompressResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = input.length

  // 检查 ffmpeg
  const ffmpegInstalled = await checkFfmpegInstalled()
  if (!ffmpegInstalled) {
    return {
      success: false,
      originalSize,
      error: 'ffmpeg 未安装，无法压缩视频。请运行 scripts/install-ffmpeg.sh 安装。'
    }
  }

  // 创建临时文件
  const tempDir = '/tmp'
  const uuid = crypto.randomUUID()
  const inputPath = path.join(tempDir, `video-input-${uuid}.mp4`)
  const outputPath = path.join(tempDir, `video-output-${uuid}.mp4`)

  try {
    // 写入输入文件
    await fs.writeFile(inputPath, input)

    // 获取视频信息
    const videoInfo = await getVideoInfo(inputPath)
    const { duration, width, height } = videoInfo

    if (duration === 0) {
      throw new Error('无法获取视频时长')
    }

    // 计算目标码率
    // 目标大小（MB）* 8（转换为 Mb）* 1024（转换为 Kb）/ 时长（秒）
    const audioBitrateKbps = parseInt(opts.audioBitrate) || 128
    const targetTotalBitrate = (opts.targetSizeMB * 8 * 1024) / duration
    let targetVideoBitrate = targetTotalBitrate - audioBitrateKbps

    // 警告信息
    let warning: string | undefined

    // 检查是否低于最低码率
    if (targetVideoBitrate < opts.minBitrate) {
      warning = `警告：视频时长 ${duration.toFixed(1)}s，压缩到 ${opts.targetSizeMB}MB 需要码率 ${targetVideoBitrate.toFixed(0)}kbps，低于最低码率 ${opts.minBitrate}kbps。画质可能严重下降。建议增加目标大小或减少视频时长。`
      targetVideoBitrate = opts.minBitrate
    }

    // 计算缩放尺寸
    let scaleFilter = ''
    if (width > opts.maxWidth || height > opts.maxHeight) {
      // 保持宽高比缩放
      scaleFilter = `-vf "scale='min(${opts.maxWidth},iw)':'min(${opts.maxHeight},ih)':force_original_aspect_ratio=decrease"`
    }

    // 构建 ffmpeg 命令
    // 使用两遍编码获得更好的质量
    const ffmpegCmd = `ffmpeg -i "${inputPath}" \
      ${scaleFilter} \
      -r ${opts.fps} \
      -c:v libx264 \
      -b:v ${Math.floor(targetVideoBitrate)}k \
      -maxrate ${Math.floor(targetVideoBitrate * 1.5)}k \
      -bufsize ${Math.floor(targetVideoBitrate * 2)}k \
      -c:a ${opts.audioCodec} \
      -b:a ${opts.audioBitrate} \
      -movflags +faststart \
      -preset fast \
      -y \
      "${outputPath}"`

    console.log('执行 ffmpeg 压缩:', {
      时长: `${duration.toFixed(1)}s`,
      原始尺寸: `${width}x${height}`,
      目标码率: `${Math.floor(targetVideoBitrate)}kbps`,
      原始大小: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      目标大小: `${opts.targetSizeMB}MB`
    })

    // 执行压缩（增加超时时间）
    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 })

    // 读取压缩后的文件
    const compressedBuffer = await fs.readFile(outputPath)
    const compressedSize = compressedBuffer.length

    // 获取压缩后的视频信息
    const compressedInfo = await getVideoInfo(outputPath)

    console.log('视频压缩完成:', {
      原始大小: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      压缩后: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
      压缩率: `${(((originalSize - compressedSize) / originalSize) * 100).toFixed(1)}%`,
      尺寸: `${compressedInfo.width}x${compressedInfo.height}`,
      码率: `${compressedInfo.bitrate.toFixed(0)}kbps`
    })

    // 清理临时文件
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})

    return {
      success: true,
      buffer: compressedBuffer,
      originalSize,
      compressedSize,
      duration,
      bitrate: compressedInfo.bitrate,
      width: compressedInfo.width,
      height: compressedInfo.height,
      warning
    }
  } catch (error) {
    console.error('视频压缩失败:', error)

    // 清理临时文件
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})

    return {
      success: false,
      originalSize,
      error: error instanceof Error ? error.message : '压缩失败'
    }
  }
}

/**
 * 检查视频是否需要压缩
 * @param input 输入视频
 * @param maxSizeMB 最大允许大小（MB）
 * @returns 是否需要压缩
 */
export async function needsVideoCompression(
  input: Buffer | Uint8Array,
  maxSizeMB: number = 1
): Promise<boolean> {
  const sizeMB = input.length / 1024 / 1024
  return sizeMB > maxSizeMB
}

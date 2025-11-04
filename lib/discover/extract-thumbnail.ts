/**
 * 视频缩略图提取模块
 * 使用 ffmpeg 从视频中提取第一帧作为缩略图
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'

const execAsync = promisify(exec)

/**
 * 缩略图提取配置
 */
export interface ThumbnailExtractOptions {
  /** 提取哪一帧（秒），默认 0.1（避免黑屏） */
  timestamp?: number
  /** 输出格式，默认 webp */
  format?: 'webp' | 'jpg' | 'png'
  /** 最大宽度，默认 1920 */
  maxWidth?: number
  /** 最大高度，默认 1080 */
  maxHeight?: number
  /** 图片质量（1-100），默认 85 */
  quality?: number
  /** 目标文件大小（KB），默认 100 */
  targetSizeKB?: number
}

/**
 * 缩略图提取结果
 */
export interface ThumbnailExtractResult {
  success: boolean
  buffer?: Buffer
  width?: number
  height?: number
  size?: number // bytes
  format?: string
  error?: string
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<ThumbnailExtractOptions> = {
  timestamp: 0.1, // 0.1秒，避免第一帧可能是黑屏
  format: 'webp',
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  targetSizeKB: 100
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
 * 从视频中提取第一帧作为缩略图
 * @param videoInput 输入视频（Buffer 或 文件路径）
 * @param options 提取选项
 * @returns 缩略图提取结果
 */
export async function extractVideoThumbnail(
  videoInput: Buffer | string,
  options: ThumbnailExtractOptions = {}
): Promise<ThumbnailExtractResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 检查 ffmpeg
  const ffmpegInstalled = await checkFfmpegInstalled()
  if (!ffmpegInstalled) {
    return {
      success: false,
      error: 'ffmpeg 未安装，无法提取缩略图。请运行 scripts/install-ffmpeg.sh 安装。'
    }
  }

  // 创建临时文件
  const tempDir = '/tmp'
  const uuid = crypto.randomUUID()
  let inputPath: string
  let needsCleanup = false

  // 处理输入
  if (Buffer.isBuffer(videoInput)) {
    inputPath = path.join(tempDir, `video-${uuid}.mp4`)
    await fs.writeFile(inputPath, videoInput)
    needsCleanup = true
  } else {
    inputPath = videoInput
  }

  const outputPath = path.join(tempDir, `thumbnail-${uuid}.png`)

  try {
    // 使用 ffmpeg 提取指定时间戳的帧
    // -ss: 指定时间戳
    // -i: 输入文件
    // -vframes 1: 只提取一帧
    // -q:v 2: 高质量输出（1-31，数字越小质量越高）
    const ffmpegCmd = `ffmpeg -ss ${opts.timestamp} -i "${inputPath}" -vframes 1 -q:v 2 -y "${outputPath}"`

    // 执行 ffmpeg 提取
    await execAsync(ffmpegCmd, { timeout: 30000 })

    // 读取提取的图片
    let imageBuffer = await fs.readFile(outputPath)

    // 使用 sharp 进行后处理：缩放、格式转换、压缩
    let sharpInstance = sharp(imageBuffer)

    // 获取原始尺寸
    const metadata = await sharpInstance.metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // 计算缩放尺寸（保持宽高比）
    let targetWidth = originalWidth
    let targetHeight = originalHeight

    if (originalWidth > opts.maxWidth || originalHeight > opts.maxHeight) {
      const widthRatio = opts.maxWidth / originalWidth
      const heightRatio = opts.maxHeight / originalHeight
      const ratio = Math.min(widthRatio, heightRatio)

      targetWidth = Math.round(originalWidth * ratio)
      targetHeight = Math.round(originalHeight * ratio)
    }

    // 应用缩放
    sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })

    // 格式转换和压缩
    let quality = opts.quality
    let outputBuffer: Buffer

    // 尝试压缩到目标大小
    const targetSizeBytes = opts.targetSizeKB * 1024
    let attempts = 0
    const maxAttempts = 5

    do {
      if (opts.format === 'webp') {
        outputBuffer = await sharpInstance.webp({ quality }).toBuffer()
      } else if (opts.format === 'jpg') {
        outputBuffer = await sharpInstance.jpeg({ quality }).toBuffer()
      } else {
        outputBuffer = await sharpInstance.png({ quality }).toBuffer()
      }

      attempts++

      // 如果大小合适或已达最大尝试次数，退出循环
      if (outputBuffer.length <= targetSizeBytes || attempts >= maxAttempts) {
        break
      }

      // 降低质量重试
      quality = Math.max(60, quality - 10)
    } while (attempts < maxAttempts)

    const finalSize = outputBuffer.length

    // 清理临时文件
    await fs.unlink(outputPath).catch(() => {})
    if (needsCleanup) {
      await fs.unlink(inputPath).catch(() => {})
    }

    return {
      success: true,
      buffer: outputBuffer,
      width: targetWidth,
      height: targetHeight,
      size: finalSize,
      format: opts.format
    }
  } catch (error) {
    // 清理临时文件
    await fs.unlink(outputPath).catch(() => {})
    if (needsCleanup) {
      await fs.unlink(inputPath).catch(() => {})
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '提取失败'
    }
  }
}

/**
 * 批量提取缩略图
 * @param videoInputs 视频输入数组
 * @param options 提取选项
 * @returns 缩略图提取结果数组
 */
export async function extractBatchThumbnails(
  videoInputs: (Buffer | string)[],
  options: ThumbnailExtractOptions = {}
): Promise<ThumbnailExtractResult[]> {
  const results = await Promise.all(
    videoInputs.map((input) => extractVideoThumbnail(input, options))
  )
  return results
}

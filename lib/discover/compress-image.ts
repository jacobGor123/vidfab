/**
 * 图片压缩模块
 * 自动将图片转换为 webp 格式，并智能压缩到目标大小
 */

import sharp from 'sharp'

/**
 * 压缩配置
 */
export interface ImageCompressOptions {
  maxWidth?: number // 最大宽度，默认 1920px
  maxHeight?: number // 最大高度，默认不限制
  targetSizeKB?: number // 目标文件大小（KB），默认 100KB
  quality?: number // 初始质量（1-100），默认 80
  minQuality?: number // 最低质量（1-100），默认 60
  format?: 'webp' | 'jpeg' | 'png' // 输出格式，默认 webp
}

/**
 * 压缩结果
 */
export interface CompressResult {
  success: boolean
  buffer?: Buffer
  originalSize: number // 原始大小（bytes）
  compressedSize?: number // 压缩后大小（bytes）
  format?: string // 输出格式
  width?: number // 输出宽度
  height?: number // 输出高度
  error?: string
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<ImageCompressOptions> = {
  maxWidth: 1920,
  maxHeight: 0, // 0 表示不限制
  targetSizeKB: 100,
  quality: 80,
  minQuality: 60,
  format: 'webp'
}

/**
 * 压缩图片
 * @param input 输入图片（Buffer 或 Uint8Array）
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressImage(
  input: Buffer | Uint8Array,
  options: ImageCompressOptions = {}
): Promise<CompressResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = input.length

  try {
    // 创建 sharp 实例
    let pipeline = sharp(input)

    // 获取原始图片信息
    const metadata = await pipeline.metadata()

    // 计算缩放尺寸
    let resizeOptions: { width?: number; height?: number } = {}
    if (metadata.width && metadata.width > opts.maxWidth) {
      resizeOptions.width = opts.maxWidth
    }
    if (opts.maxHeight > 0 && metadata.height && metadata.height > opts.maxHeight) {
      resizeOptions.height = opts.maxHeight
    }

    // 应用缩放
    if (Object.keys(resizeOptions).length > 0) {
      pipeline = pipeline.resize({
        ...resizeOptions,
        fit: 'inside', // 保持宽高比
        withoutEnlargement: true // 不放大图片
      })
    }

    // 初始压缩
    let quality = opts.quality
    let compressedBuffer: Buffer | undefined

    // 根据格式应用压缩
    if (opts.format === 'webp') {
      compressedBuffer = await pipeline.webp({ quality }).toBuffer()
    } else if (opts.format === 'jpeg') {
      compressedBuffer = await pipeline.jpeg({ quality }).toBuffer()
    } else if (opts.format === 'png') {
      compressedBuffer = await pipeline.png({ quality }).toBuffer()
    } else {
      compressedBuffer = await pipeline.webp({ quality }).toBuffer()
    }

    // 如果文件大小超过目标，逐步降低质量
    const targetSizeBytes = opts.targetSizeKB * 1024
    let attempts = 0
    const maxAttempts = 5

    while (
      compressedBuffer.length > targetSizeBytes &&
      quality > opts.minQuality &&
      attempts < maxAttempts
    ) {
      quality -= 10
      attempts++

      // 重新压缩
      pipeline = sharp(input)
      if (Object.keys(resizeOptions).length > 0) {
        pipeline = pipeline.resize({
          ...resizeOptions,
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      if (opts.format === 'webp') {
        compressedBuffer = await pipeline.webp({ quality }).toBuffer()
      } else if (opts.format === 'jpeg') {
        compressedBuffer = await pipeline.jpeg({ quality }).toBuffer()
      } else if (opts.format === 'png') {
        compressedBuffer = await pipeline.png({ quality }).toBuffer()
      } else {
        compressedBuffer = await pipeline.webp({ quality }).toBuffer()
      }
    }

    // 获取最终图片信息
    const finalMetadata = await sharp(compressedBuffer).metadata()

    console.log(`图片压缩完成:`, {
      原始大小: `${(originalSize / 1024).toFixed(2)}KB`,
      压缩后: `${(compressedBuffer.length / 1024).toFixed(2)}KB`,
      压缩率: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
      质量: quality,
      尺寸: `${finalMetadata.width}x${finalMetadata.height}`,
      格式: opts.format
    })

    return {
      success: true,
      buffer: compressedBuffer,
      originalSize,
      compressedSize: compressedBuffer.length,
      format: opts.format,
      width: finalMetadata.width,
      height: finalMetadata.height
    }
  } catch (error) {
    console.error('图片压缩失败:', error)
    return {
      success: false,
      originalSize,
      error: error instanceof Error ? error.message : '压缩失败'
    }
  }
}

/**
 * 批量压缩图片
 * @param inputs 输入图片数组
 * @param options 压缩选项
 * @returns 压缩结果数组
 */
export async function compressImages(
  inputs: Array<Buffer | Uint8Array>,
  options: ImageCompressOptions = {}
): Promise<CompressResult[]> {
  return Promise.all(inputs.map((input) => compressImage(input, options)))
}

/**
 * 检查图片是否需要压缩
 * @param input 输入图片
 * @param maxSizeKB 最大允许大小（KB）
 * @returns 是否需要压缩
 */
export async function needsCompression(
  input: Buffer | Uint8Array,
  maxSizeKB: number = 100
): Promise<boolean> {
  try {
    const metadata = await sharp(input).metadata()
    const sizeKB = input.length / 1024

    // 如果文件大小超过限制，或者不是 webp 格式，则需要压缩
    return sizeKB > maxSizeKB || metadata.format !== 'webp'
  } catch (error) {
    console.error('检查图片失败:', error)
    return true // 出错时默认需要压缩
  }
}

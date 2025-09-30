/**
 * 服务器端图片处理工具类 - 用于Node.js环境的image-to-video功能
 * 使用sharp库进行图片处理，避免浏览器API依赖
 */
import sharp from 'sharp';
import { promisify } from 'util';

export interface ImageMetadata {
  width: number
  height: number
  size: number
  type: string
  aspectRatio: number
}

export interface ImageProcessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

export interface ProcessedImageResult {
  buffer: Buffer
  metadata: ImageMetadata
  originalMetadata: ImageMetadata
  compressionRatio: number
}

export class ServerImageProcessor {

  /**
   * 验证图片文件（服务器端版本）
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported image format: ${file.type}. Supported formats: JPG, PNG, WebP`
      }
    }

    // 检查文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Image file too large. Maximum: ${maxSize / (1024 * 1024)}MB, Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      }
    }

    return { valid: true }
  }

  /**
   * 获取图片元数据（服务器端版本）
   */
  static async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer)
      const metadata = await image.metadata()
      const stats = await image.stats()

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: cannot determine dimensions')
      }

      return {
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        type: `image/${metadata.format}`,
        aspectRatio: metadata.width / metadata.height
      }
    } catch (error: any) {
      console.error('Failed to get image metadata:', error)
      throw new Error('Failed to process image metadata')
    }
  }

  /**
   * 处理图片（服务器端版本）
   */
  static async processImage(
    buffer: Buffer,
    options: ImageProcessOptions = {}
  ): Promise<ProcessedImageResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 80,
      format = 'jpeg',
      maintainAspectRatio = true
    } = options

    try {
      const originalMetadata = await this.getImageMetadata(buffer)

      let image = sharp(buffer)

      // 计算新的尺寸
      let newWidth = originalMetadata.width
      let newHeight = originalMetadata.height

      if (maintainAspectRatio) {
        const { width, height } = this.calculateNewDimensions(
          originalMetadata.width,
          originalMetadata.height,
          maxWidth,
          maxHeight,
          maintainAspectRatio
        )
        newWidth = width
        newHeight = height
      } else {
        newWidth = maxWidth
        newHeight = maxHeight
      }

      // 调整尺寸
      if (newWidth !== originalMetadata.width || newHeight !== originalMetadata.height) {
        image = image.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // 转换格式和质量
      let processedBuffer: Buffer

      switch (format) {
        case 'jpeg':
          processedBuffer = await image
            .jpeg({ quality, mozjpeg: true })
            .toBuffer()
          break
        case 'png':
          processedBuffer = await image
            .png({ quality })
            .toBuffer()
          break
        case 'webp':
          processedBuffer = await image
            .webp({ quality })
            .toBuffer()
          break
        default:
          processedBuffer = await image
            .jpeg({ quality })
            .toBuffer()
      }

      const processedMetadata = await this.getImageMetadata(processedBuffer)
      const compressionRatio = originalMetadata.size / processedBuffer.length

      return {
        buffer: processedBuffer,
        metadata: processedMetadata,
        originalMetadata,
        compressionRatio
      }
    } catch (error: any) {
      console.error('Image processing failed:', error)
      throw new Error(`Image processing failed: ${error.message}`)
    }
  }

  /**
   * 计算新的图片尺寸
   */
  private static calculateNewDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight }
    }

    const aspectRatio = originalWidth / originalHeight

    let width = originalWidth
    let height = originalHeight

    // 如果图片太大，按比例缩放
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  /**
   * 智能压缩 - 根据文件大小自动选择最佳压缩策略
   */
  static getOptimalProcessingOptions(fileSizeBytes: number): ImageProcessOptions {
    const sizeMB = fileSizeBytes / (1024 * 1024)

    if (sizeMB < 2) {
      // 小于2MB：保持高质量
      return {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 95,
        format: 'jpeg',
        maintainAspectRatio: true
      }
    } else if (sizeMB < 5) {
      // 2-5MB：标准压缩
      return {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 80,
        format: 'jpeg',
        maintainAspectRatio: true
      }
    } else {
      // 大于5MB：强力压缩
      return {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 70,
        format: 'jpeg',
        maintainAspectRatio: true
      }
    }
  }

  /**
   * 智能处理图片 - 自动选择最佳压缩参数
   */
  static async processImageSmart(buffer: Buffer): Promise<ProcessedImageResult> {
    const optimalOptions = this.getOptimalProcessingOptions(buffer.length)

    console.log(`📸 Server-side image processing:`, {
      fileSize: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
      strategy: buffer.length < 2 * 1024 * 1024 ? 'High quality' :
                buffer.length < 5 * 1024 * 1024 ? 'Standard compression' : 'Strong compression',
      maxWidth: optimalOptions.maxWidth,
      quality: `${optimalOptions.quality}%`
    })

    return this.processImage(buffer, optimalOptions)
  }

  /**
   * 验证图片URL（服务器端版本）
   */
  static async validateImageUrl(url: string): Promise<{
    valid: boolean;
    error?: string;
    metadata?: ImageMetadata;
    buffer?: Buffer;
  }> {
    try {
      // 检查URL格式
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Only HTTP/HTTPS protocols are supported' }
      }

      // 下载图片
      const response = await fetch(url)
      if (!response.ok) {
        return { valid: false, error: 'Cannot access the image URL' }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.startsWith('image/')) {
        return { valid: false, error: 'URL is not a valid image resource' }
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(contentType)) {
        return { valid: false, error: `Unsupported image format: ${contentType}` }
      }

      // 获取图片数据
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 检查文件大小
      const maxSize = 10 * 1024 * 1024
      if (buffer.length > maxSize) {
        return {
          valid: false,
          error: `Image too large. Maximum: ${maxSize / (1024 * 1024)}MB, Current: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`
        }
      }

      // 获取图片元数据
      const metadata = await this.getImageMetadata(buffer)

      return {
        valid: true,
        metadata,
        buffer
      }

    } catch (error: any) {
      return { valid: false, error: error.message || 'Invalid URL format' }
    }
  }

  /**
   * URL转换为Buffer（服务器端版本）
   */
  static async urlToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // 从URL推断文件名
      const urlPath = new URL(url).pathname
      const extension = contentType.split('/')[1] || 'jpg'
      let filename = urlPath.split('/').pop() || `image.${extension}`

      // 确保文件名有正确的扩展名
      if (!filename.includes('.')) {
        filename += `.${extension}`
      }

      return {
        buffer,
        contentType,
        filename
      }
    } catch (error: any) {
      console.error('URL to buffer conversion failed:', error)
      throw new Error('Failed to download image')
    }
  }
}
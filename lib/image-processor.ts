/**
 * 图片处理工具类 - 用于image-to-video功能
 * 包括压缩、尺寸调整、格式转换等功能
 */

export interface ImageProcessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

export interface ImageMetadata {
  width: number
  height: number
  size: number
  type: string
  aspectRatio: number
}

export interface ProcessedImageResult {
  file: File
  metadata: ImageMetadata
  originalMetadata: ImageMetadata
  compressionRatio: number
}

export class ImageProcessor {

  /**
   * 获取图片元数据
   */
  static async getImageMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        const metadata: ImageMetadata = {
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          aspectRatio: img.width / img.height
        }
        resolve(metadata)
      }

      img.onerror = () => reject(new Error('无法加载图片'))

      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * 验证图片文件
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    let fileType = file.type

    // 🔥 处理 binary/octet-stream 的情况，根据文件扩展名推断类型
    if (fileType === 'binary/octet-stream' || fileType === 'application/octet-stream' || !fileType) {
      const ext = file.name.toLowerCase().split('.').pop()
      if (ext === 'jpg' || ext === 'jpeg') {
        fileType = 'image/jpeg'
      } else if (ext === 'png') {
        fileType = 'image/png'
      } else if (ext === 'webp') {
        fileType = 'image/webp'
      }
    }

    if (!allowedTypes.includes(fileType)) {
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
        error: `Image file too large. Max: ${maxSize / (1024 * 1024)}MB, Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      }
    }

    return { valid: true }
  }

  /**
   * 验证图片URL
   */
  static async validateImageUrl(url: string): Promise<{ valid: boolean; error?: string; metadata?: ImageMetadata }> {
    try {
      // 检查URL格式
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Only HTTP/HTTPS protocols are supported' }
      }

      // 尝试加载图片获取元数据
      const response = await fetch(url, { method: 'HEAD' })
      if (!response.ok) {
        return { valid: false, error: 'Unable to access the image URL' }
      }

      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')

      if (!contentType || !contentType.startsWith('image/')) {
        return { valid: false, error: 'URL does not point to a valid image resource' }
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(contentType)) {
        return { valid: false, error: `Unsupported image format: ${contentType}` }
      }

      // 检查文件大小
      if (contentLength) {
        const size = parseInt(contentLength)
        const maxSize = 10 * 1024 * 1024
        if (size > maxSize) {
          return {
            valid: false,
            error: `Image file too large. Max: ${maxSize / (1024 * 1024)}MB, Current: ${(size / (1024 * 1024)).toFixed(2)}MB`
          }
        }
      }

      // 获取图片尺寸信息
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
          const metadata: ImageMetadata = {
            width: img.width,
            height: img.height,
            size: contentLength ? parseInt(contentLength) : 0,
            type: contentType,
            aspectRatio: img.width / img.height
          }
          resolve({ valid: true, metadata })
        }

        img.onerror = () => {
          resolve({ valid: false, error: '无法加载图片内容' })
        }

        img.src = url
      })

    } catch (error) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }

  /**
   * 压缩和调整图片
   */
  static async processImage(
    file: File,
    options: ImageProcessOptions = {}
  ): Promise<ProcessedImageResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
      maintainAspectRatio = true
    } = options

    const originalMetadata = await this.getImageMetadata(file)

    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }

      img.onload = () => {
        // 计算新的尺寸
        let { width, height } = this.calculateNewDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          maintainAspectRatio
        )

        // 设置canvas尺寸
        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片处理失败'))
              return
            }

            // 创建新的File对象
            const processedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now()
            })

            const metadata: ImageMetadata = {
              width,
              height,
              size: blob.size,
              type: `image/${format}`,
              aspectRatio: width / height
            }

            const compressionRatio = originalMetadata.size / blob.size

            resolve({
              file: processedFile,
              metadata,
              originalMetadata,
              compressionRatio
            })
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => reject(new Error('无法加载图片'))

      // 加载图片
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
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
   * 生成图片预览URL
   */
  static async createPreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('无法生成预览'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * 获取图片的主色调
   */
  static async getDominantColor(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        const colorMap = new Map<string, number>()

        // 采样像素点 (每10个像素采样一次以提高性能)
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const alpha = data[i + 3]

          if (alpha > 128) { // 忽略透明像素
            const color = `rgb(${r},${g},${b})`
            colorMap.set(color, (colorMap.get(color) || 0) + 1)
          }
        }

        // 找到出现次数最多的颜色
        let dominantColor = 'rgb(128,128,128)'
        let maxCount = 0

        for (const [color, count] of colorMap) {
          if (count > maxCount) {
            maxCount = count
            dominantColor = color
          }
        }

        resolve(dominantColor)
      }

      img.onerror = () => reject(new Error('无法分析图片颜色'))

      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * 🤖 智能压缩 - 根据文件大小自动选择最佳压缩策略，保持原始宽高比
   */
  static getOptimalProcessingOptions(fileSizeBytes: number): ImageProcessOptions {
    const sizeMB = fileSizeBytes / (1024 * 1024)

    if (sizeMB < 2) {
      // 小于2MB：保持高质量，只限制最大尺寸，不强制压缩
      return {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.95, // 提高质量，减少不必要的压缩
        format: 'jpeg',
        maintainAspectRatio: true
      }
    } else if (sizeMB < 5) {
      // 2-5MB：标准压缩，保持良好质量
      return IMAGE_PRESETS.STANDARD
    } else {
      // 大于5MB：适度压缩，仍保持宽高比
      return IMAGE_PRESETS.COMPRESSED
    }
  }

  /**
   * 🚀 智能处理图片 - 自动选择最佳压缩参数
   */
  static async processImageSmart(file: File): Promise<ProcessedImageResult> {
    const optimalOptions = this.getOptimalProcessingOptions(file.size)

    console.log(`📸 智能压缩策略:`, {
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      strategy: file.size < 2 * 1024 * 1024 ? '高质量保持' :
                file.size < 5 * 1024 * 1024 ? '标准压缩' : '强力压缩',
      maxWidth: optimalOptions.maxWidth,
      quality: `${(optimalOptions.quality! * 100)}%`
    })

    return this.processImage(file, optimalOptions)
  }

  /**
   * 批量处理图片
   */
  static async processBatch(
    files: File[],
    options: ImageProcessOptions = {},
    onProgress?: (processed: number, total: number) => void
  ): Promise<ProcessedImageResult[]> {
    const results: ProcessedImageResult[] = []

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.processImage(files[i], options)
        results.push(result)
        onProgress?.(i + 1, files.length)
      } catch (error) {
        console.error(`处理图片 ${files[i].name} 失败:`, error)
        throw error
      }
    }

    return results
  }

  /**
   * 将URL转换为File对象 (用于URL输入的图片)
   */
  static async urlToFile(url: string, filename?: string): Promise<File> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // 从URL或content-type推断文件名
      if (!filename) {
        const urlPath = new URL(url).pathname
        const extension = contentType.split('/')[1] || 'jpg'
        filename = urlPath.split('/').pop() || `image.${extension}`

        // 确保文件名有正确的扩展名
        if (!filename.includes('.')) {
          filename += `.${extension}`
        }
      }

      return new File([blob], filename, { type: contentType })
    } catch (error) {
      console.error('URL转File失败:', error)
      throw new Error('无法下载图片')
    }
  }
}

// 常用的图片处理预设 - 优化为支持所有宽高比（16:9、9:16、1:1）
export const IMAGE_PRESETS = {
  // 高质量 - 适合专业用途
  HIGH_QUALITY: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    format: 'jpeg' as const,
    maintainAspectRatio: true
  },

  // 标准质量 - 优化为支持各种宽高比
  STANDARD: {
    maxWidth: 2048,  // 提高最大宽度，适应横图和方图
    maxHeight: 2048, // 提高最大高度，适应竖图和方图
    quality: 0.8,
    format: 'jpeg' as const,
    maintainAspectRatio: true
  },

  // 压缩模式 - 优化为支持各种宽高比
  COMPRESSED: {
    maxWidth: 1600,  // 提高最大宽度，适应横图和方图
    maxHeight: 1600, // 提高最大高度，适应竖图和方图
    quality: 0.7,
    format: 'jpeg' as const,
    maintainAspectRatio: true
  },

  // 缩略图模式
  THUMBNAIL: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    format: 'jpeg' as const,
    maintainAspectRatio: true
  }
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS
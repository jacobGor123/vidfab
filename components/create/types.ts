/**
 * Image-to-Video 功能通用类型定义
 */

/**
 * 图片转视频参数
 */
export interface ImageToVideoParams {
  image: string // Image URL or base64
  imageFile: File | null // Local file reference
  uploadMode: 'local' | 'url'
  prompt: string
  model: string
  duration: string
  resolution: string
  aspectRatio: string
  style: string
}

/**
 * 图片上传相关类型定义
 */

/**
 * 上传任务状态
 */
export interface UploadTask {
  id: string
  file: File
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'failed'
  previewUrl: string | null
  resultUrl: string | null
  error: string | null
  size: number
  timestamp: number
}

/**
 * 上传回调函数
 */
export interface UploadCallbacks {
  onUploadStart?: (taskId: string) => void
  onUploadProgress?: (taskId: string, progress: number) => void
  onUploadComplete?: (taskId: string, url: string) => void
  onUploadError?: (taskId: string, error: string) => void
}

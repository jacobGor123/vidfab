/**
 * Queue System Types and Interfaces
 * VidFab AI Video Platform
 */

// Job types that can be processed by the queue
export type JobType =
  | 'download_video'      // Download video from Wavespeed to Supabase Storage
  | 'generate_thumbnail'  // Generate thumbnail from video
  | 'cleanup_temp'        // Clean up temporary files
  | 'update_quota'        // Update user storage quota
  | 'storyboard_generation'  // Generate storyboards for video-agent projects

// Job status values
export type JobStatus =
  | 'waiting'     // Job is waiting to be processed
  | 'active'      // Job is currently being processed
  | 'completed'   // Job completed successfully
  | 'failed'      // Job failed with error
  | 'delayed'     // Job is delayed/scheduled for later
  | 'stuck'       // Job is stuck and needs manual intervention

// Priority levels for jobs
export type JobPriority = 'critical' | 'high' | 'normal' | 'low'

// Base job data interface
export interface BaseJobData {
  jobId: string
  userId: string
  videoId: string
  createdAt: string
  metadata?: Record<string, any>
}

// Specific job data interfaces
export interface DownloadVideoJobData extends BaseJobData {
  type: 'download_video'
  wavespeedRequestId: string
  originalUrl: string
  storagePath: string
  settings: {
    model: string
    duration: string
    resolution: string
    aspectRatio: string
    style?: string
  }
  retryCount?: number
}

export interface GenerateThumbnailJobData extends BaseJobData {
  type: 'generate_thumbnail'
  videoPath: string
  thumbnailPath: string
  thumbnailSettings: {
    width: number
    height: number
    quality: number
    format: 'jpg' | 'png' | 'webp'
    timeOffset?: number // seconds from start
  }
}

export interface CleanupTempJobData extends BaseJobData {
  type: 'cleanup_temp'
  tempUrls: string[]
  cleanupAfter: string // ISO date string
}

export interface UpdateQuotaJobData extends BaseJobData {
  type: 'update_quota'
  operation: 'add' | 'remove' | 'recalculate'
  sizeChange?: number
  videoCount?: number
}

export interface StoryboardGenerationJobData extends BaseJobData {
  type: 'storyboard_generation'
  projectId: string
  // 🔥 使用完整的 Shot 类型（从 video-agent types 导入）
  // 包含所有必需字段，避免数据丢失
  shots: Array<{
    shot_number: number
    time_range: string           // 时间范围，如 "00:00-00:05"
    description: string           // 场景描述
    camera_angle: string          // 镜头角度
    character_action: string      // 角色动作描述
    characters: string[]          // 出现的角色列表
    mood: string                  // 情绪氛围
    duration_seconds: number      // 时长（秒）
    seed?: number                 // 可选：生成视频时的随机种子
  }>
  // 🔥 使用完整的 CharacterConfig 类型
  characters: Array<{
    name: string
    description: string
    reference_image_url?: string
    // 可能还有其他字段，保持与 video-agent types 一致
  }>
  style: string
  aspectRatio: '16:9' | '9:16'
}

// Union type for all job data
export type VideoJobData =
  | DownloadVideoJobData
  | GenerateThumbnailJobData
  | CleanupTempJobData
  | UpdateQuotaJobData
  | StoryboardGenerationJobData

// Job configuration
export interface JobConfig {
  priority: JobPriority
  delay?: number          // Delay in milliseconds
  attempts?: number       // Max retry attempts
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
  removeOnComplete?: number // Keep N completed jobs
  removeOnFail?: number     // Keep N failed jobs
  timeout?: number          // Job timeout in milliseconds
}

// Queue configuration
export interface QueueConfig {
  name: string
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }
  defaultJobOptions: JobConfig
  concurrency: number
  stalledInterval: number
  maxStalledCount: number
}

// Job progress tracking
export interface JobProgress {
  percent: number           // 0-100
  message?: string
  stage?: string
  estimatedTimeRemaining?: number // seconds
  processed?: number
  total?: number
}

// Job result interface
export interface JobResult<T = any> {
  success: boolean
  data?: T
  error?: string
  duration?: number
  retryCount?: number
  finishedAt: string
}

// Job event data
export interface JobEvent {
  jobId: string
  type: JobType
  event: 'waiting' | 'active' | 'progress' | 'completed' | 'failed' | 'stalled'
  data: any
  timestamp: string
}

// Worker event handlers
export interface WorkerEventHandlers {
  onActive?: (job: VideoJobData) => void | Promise<void>
  onProgress?: (job: VideoJobData, progress: JobProgress) => void | Promise<void>
  onCompleted?: (job: VideoJobData, result: JobResult) => void | Promise<void>
  onFailed?: (job: VideoJobData, error: Error) => void | Promise<void>
  onStalled?: (job: VideoJobData) => void | Promise<void>
}

// Queue statistics
export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

// Worker status
export interface WorkerStatus {
  id: string
  status: 'running' | 'paused' | 'stopped'
  concurrency: number
  processing: string[]  // Job IDs currently being processed
  startedAt: string
  processedTotal: number
  failedTotal: number
}
/**
 * Admin Tasks Type Definitions
 * Unified task interface for all task types in the admin dashboard
 *
 * Note: 当前所有任务都存储在 user_videos 表中
 * TaskType 保留用于未来扩展或分类显示
 */

export type TaskType = 'video_generation' | 'image_generation';  // 支持视频和图片生成任务

export type TaskStatus = 'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted' | 'uploading';

export type GenerationType = 'text_to_video' | 'image_to_video' | 'video_effects' | 'text_to_image' | 'image_to_image';

/**
 * Unified Task Interface
 * 基于 user_videos 表结构的统一任务接口
 */
export interface UnifiedTask {
  // 核心字段
  id: string;                      // user_videos.id (UUID)
  task_type: TaskType;             // 固定为 'video_generation'
  user_id: string | null;
  user_email: string | null;
  status: TaskStatus;
  progress: number;                // 0-100 (download_progress)
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp

  // 生成类型和输入数据
  generation_type: GenerationType; // text_to_video / image_to_video / video_effects
  input_image_url: string | null;  // settings.image_url（image_to_video 或 video_effects）
  prompt: string;                  // user_videos.prompt

  // 输出数据
  video_url: string | null;        // user_videos.original_url
  image_url?: string | null;       // user_images.storage_url（图片任务特有）
  storage_path: string | null;     // user_videos.storage_path / user_images.storage_path
  thumbnail_path: string | null;   // user_videos.thumbnail_path（图片任务无缩略图）

  // 任务参数
  model: string | null;            // settings.model
  duration: number | null;         // duration_seconds
  resolution: string | null;       // settings.resolution (例如: "480p", "720p", "1080p")
  aspectRatio: string | null;      // settings.aspectRatio (例如: "16:9", "9:16", "1:1")
  durationStr: string | null;      // settings.duration (例如: "5s", "8s", "10s")
  settings: any;                   // 完整的 settings JSONB

  // Video Effects 特有字段
  effectId: string | null;         // settings.effectId
  effectName: string | null;       // settings.effectName

  // 图片任务特有字段
  width?: number | null;           // user_images.width（图片宽度）
  height?: number | null;          // user_images.height（图片高度）
  upload_source?: 'file' | 'url' | null;  // user_images.upload_source（上传来源）
  source_images?: any | null;      // user_images.source_images（image_to_image 的源图片）

  // 积分和错误
  credits_used: number;            // 默认 0（当前未跟踪）
  error: string | null;            // error_message

  // 外部任务 ID
  wavespeed_request_id: string;    // user_videos.wavespeed_request_id
}

/**
 * Task Statistics
 */
export interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

/**
 * Fetch Tasks Options
 */
export interface FetchTasksOptions {
  taskType?: TaskType;
  limit?: number;
  cursor?: string;  // ISO timestamp for cursor-based pagination
  excludeEmail?: string;  // 排除包含该关键词的邮箱
}

/**
 * Fetch Tasks Result
 */
export interface FetchTasksResult {
  tasks: UnifiedTask[];
  nextCursor: string | null;
  hasMore: boolean;
}

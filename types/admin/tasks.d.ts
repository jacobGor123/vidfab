/**
 * Admin Tasks Type Definitions
 * Unified task interface for all task types in the admin dashboard
 */

export type TaskType =
  | 'video_generation'    // Image to video generation
  | 'audio_generation'    // Video audio/sound effects
  | 'watermark_removal'   // Video watermark removal
  | 'video_upscaler'      // Video upscaling/super resolution
  | 'video_effects'       // AI video effects
  | 'face_swap';          // Face swap in videos

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Unified Task Interface
 * Combines all task types into a single standardized format
 */
export interface UnifiedTask {
  // Core fields (present in all tasks)
  id: string;                      // Format: {task_type}_{original_id}
  task_type: TaskType;
  user_id: string | null;
  user_email: string | null;
  status: TaskStatus;
  progress: number;                // 0-100
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp

  // Input data (varies by task type)
  input_image_url?: string | null;
  input_video_url?: string | null;
  face_image_url?: string | null;
  prompt?: string | null;

  // Output data
  result_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;

  // Task parameters
  model?: string | null;
  provider?: string | null;
  duration?: number | null;
  target_resolution?: string | null;
  template_id?: string | null;
  template_name?: string | null;

  // Credits and errors
  credits_used: number;
  error?: string | null;

  // External task IDs
  replicate_prediction_id?: string | null;
  wavespeed_task_id?: string | null;
  external_task_id?: string | null;
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
}

/**
 * Fetch Tasks Result
 */
export interface FetchTasksResult {
  tasks: UnifiedTask[];
  nextCursor: string | null;
  hasMore: boolean;
}

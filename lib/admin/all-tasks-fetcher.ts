/**
 * All Tasks Fetcher - Business Logic Layer
 * Handles fetching and aggregating tasks from multiple tables
 * Implements cursor-based pagination for optimal performance
 */

import { getSupabaseAdminClient } from '@/models/db';
import {
  TaskType,
  UnifiedTask,
  TaskStats,
  FetchTasksOptions,
  FetchTasksResult,
} from '@/types/admin/tasks';

/**
 * Map task type to database table name
 */
function getTableName(taskType: TaskType): string {
  const mapping: Record<TaskType, string> = {
    video_generation: 'user_videos', // 🔥 Using user_videos for historical data
    audio_generation: 'audio_generation_tasks',
    watermark_removal: 'watermark_removal_tasks',
    video_upscaler: 'video_upscaler_tasks',
    video_effects: 'video_effect_tasks',
    face_swap: 'video_face_swap_tasks',
  };
  return mapping[taskType];
}

/**
 * Normalize raw task data to UnifiedTask format
 * Handles different field names across different task tables
 */
function normalizeTask(rawTask: any, taskType: TaskType): UnifiedTask {
  // Base fields common to all tasks
  const base: Partial<UnifiedTask> = {
    id: `${taskType}_${rawTask.id}`,
    task_type: taskType,
    user_id: rawTask.user_id || null,
    user_email: rawTask.user_email || null,
    status: rawTask.status,
    progress: rawTask.download_progress || rawTask.progress || (rawTask.status === 'completed' ? 100 : 0),
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,
    credits_used: rawTask.credits_used || 0,
    error: rawTask.error_message || rawTask.error || null,
  };

  // Add task-specific fields based on type
  switch (taskType) {
    case 'video_generation':
      return {
        ...base,
        input_image_url: rawTask.image_url || rawTask.input_image || null,
        prompt: rawTask.prompt || rawTask.description || null,
        video_url: rawTask.original_url || rawTask.video_url || rawTask.result_url || null, // 🔥 user_videos uses 'original_url'
        model: rawTask.settings?.model || rawTask.model || rawTask.provider || null,
        provider: rawTask.settings?.model || rawTask.provider || null,
        duration: rawTask.duration_seconds || rawTask.duration || null,
        replicate_prediction_id: rawTask.replicate_prediction_id || null,
        external_task_id: rawTask.wavespeed_request_id || rawTask.external_task_id || null, // 🔥 user_videos uses 'wavespeed_request_id'
      } as UnifiedTask;

    case 'audio_generation':
      return {
        ...base,
        input_video_url: rawTask.video_url || null,
        prompt: rawTask.prompt || null,
        audio_url: rawTask.audio_url || null,
        replicate_prediction_id: rawTask.replicate_prediction_id || null,
      } as UnifiedTask;

    case 'watermark_removal':
      return {
        ...base,
        input_video_url: rawTask.video_url || rawTask.input_video_url || null,
        result_url: rawTask.result_url || null,
      } as UnifiedTask;

    case 'video_upscaler':
      return {
        ...base,
        input_video_url: rawTask.video_url || rawTask.input_video_url || null,
        result_url: rawTask.result_url || null,
        target_resolution: rawTask.target_resolution || null,
      } as UnifiedTask;

    case 'video_effects':
      return {
        ...base,
        input_image_url: rawTask.image_url || rawTask.input_image_url || null,
        result_url: rawTask.result_url || rawTask.video_url || null,
        template_id: rawTask.template_id || null,
        template_name: rawTask.template_name || null,
        wavespeed_task_id: rawTask.wavespeed_task_id || rawTask.external_task_id || null,
        external_task_id: rawTask.external_task_id || rawTask.wavespeed_task_id || null,
      } as UnifiedTask;

    case 'face_swap':
      return {
        ...base,
        face_image_url: rawTask.face_image_url || null,
        input_video_url: rawTask.video_url || rawTask.input_video_url || null,
        result_url: rawTask.result_video_url || rawTask.result_url || null,
        wavespeed_task_id: rawTask.wavespeed_task_id || rawTask.external_task_id || null,
        external_task_id: rawTask.external_task_id || rawTask.wavespeed_task_id || null,
      } as UnifiedTask;

    default:
      return base as UnifiedTask;
  }
}

/**
 * Fetch all tasks with cursor-based pagination
 * Supports filtering by task type and efficient multi-table queries
 */
export async function fetchAllTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { taskType, limit = 50, cursor } = options;
  const supabase = getSupabaseAdminClient();

  const allTasks: UnifiedTask[] = [];

  // Determine which tables to query
  const tablesToQuery: { table: string; type: TaskType }[] = taskType
    ? [{ table: getTableName(taskType), type: taskType }]
    : [
        { table: 'user_videos', type: 'video_generation' }, // 🔥 Using user_videos for video generation
        { table: 'audio_generation_tasks', type: 'audio_generation' },
        { table: 'watermark_removal_tasks', type: 'watermark_removal' },
        { table: 'video_upscaler_tasks', type: 'video_upscaler' },
        { table: 'video_effect_tasks', type: 'video_effects' },
        { table: 'video_face_swap_tasks', type: 'face_swap' },
      ];

  // Query all tables in parallel
  const results = await Promise.allSettled(
    tablesToQuery.map(({ table, type }) => {
      // 🔥 Special handling for user_videos: JOIN with users table to get email
      if (table === 'user_videos') {
        let query = supabase
          .from(table)
          .select('*, users(email)')
          .order('created_at', { ascending: false });

        // Apply cursor if provided (only get tasks older than cursor)
        if (cursor) {
          query = query.lt('created_at', cursor);
        }

        // Fetch limit + 1 to determine if there are more results
        return query
          .limit(limit + 1)
          .then(({ data, error }) => {
            if (error) {
              console.error(`Failed to fetch ${table}:`, error.message);
              return [];
            }
            // Flatten the users object to get email
            return (data || []).map((item: any) => {
              const flatItem = {
                ...item,
                user_email: item.users?.email || null,
              };
              delete flatItem.users;
              return normalizeTask(flatItem, type);
            });
          });
      }

      // Standard query for other tables
      let query = supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply cursor if provided (only get tasks older than cursor)
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      // Fetch limit + 1 to determine if there are more results
      return query
        .limit(limit + 1)
        .then(({ data, error }) => {
          if (error) {
            console.warn(`Failed to fetch ${table}:`, error.message);
            return [];
          }
          return (data || []).map((item) => normalizeTask(item, type));
        });
    })
  );

  // Collect all successful results
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allTasks.push(...result.value);
    }
  });

  // Sort by created_at descending
  allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Determine if there are more results
  const hasMore = allTasks.length > limit;
  const tasks = hasMore ? allTasks.slice(0, limit) : allTasks;

  // Calculate next cursor (last task's created_at)
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return {
    tasks,
    nextCursor,
    hasMore,
  };
}

/**
 * Fetch task statistics
 * Returns counts for total, completed, failed, and processing tasks
 */
export async function fetchTaskStats(taskType?: TaskType): Promise<TaskStats> {
  const supabase = getSupabaseAdminClient();

  const tablesToQuery = taskType
    ? [getTableName(taskType)]
    : [
        'user_videos', // 🔥 Using user_videos for video generation stats
        'audio_generation_tasks',
        'watermark_removal_tasks',
        'video_upscaler_tasks',
        'video_effect_tasks',
        'video_face_swap_tasks',
      ];

  let total = 0;
  let completed = 0;
  let failed = 0;
  let processing = 0;

  // Query statistics from all tables in parallel
  const results = await Promise.allSettled(
    tablesToQuery.flatMap((table) => [
      // Total count
      supabase.from(table).select('id', { count: 'exact', head: true }),
      // Completed count
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      // Failed count
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      // Processing count (pending + processing)
      supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']),
    ])
  );

  // Aggregate results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const count = result.value.count || 0;
      const statType = index % 4;

      if (statType === 0) total += count;
      else if (statType === 1) completed += count;
      else if (statType === 2) failed += count;
      else if (statType === 3) processing += count;
    }
  });

  return { total, completed, failed, processing };
}

/**
 * Get task type display label
 */
export function getTaskTypeLabel(taskType: TaskType | 'all'): string {
  const labels: Record<TaskType | 'all', string> = {
    all: 'All Tasks',
    video_generation: 'Image to Video',
    audio_generation: 'Audio Generation',
    watermark_removal: 'Watermark Removal',
    video_upscaler: 'Video Upscaler',
    video_effects: 'AI Effects',
    face_swap: 'Face Swap',
  };
  return labels[taskType] || taskType;
}

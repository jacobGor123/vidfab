/**
 * All Tasks Fetcher - Business Logic Layer
 * 从 user_videos 表获取所有任务数据
 * 实现基于游标的分页以优化性能
 */

import { getSupabaseAdminClient } from '@/models/db';
import {
  TaskType,
  UnifiedTask,
  TaskStats,
  FetchTasksOptions,
  FetchTasksResult,
  GenerationType,
} from '@/types/admin/tasks';

/**
 * 判断任务的生成类型
 */
function determineGenerationType(settings: any): GenerationType {
  // 🔥 调试：记录 settings 内容（生产环境可以删除）
  if (process.env.NODE_ENV === 'development') {
    console.log('[determineGenerationType] settings:', JSON.stringify(settings, null, 2));
  }

  // 优先使用显式的 generationType 字段
  if (settings?.generationType) {
    // 🔥 修复:转换中划线格式为下划线格式
    const type = settings.generationType;
    if (type === 'image-to-video') return 'image_to_video';
    if (type === 'video-effects') return 'video_effects';
    if (type === 'text-to-video') return 'text_to_video';
    // 如果已经是下划线格式,直接返回
    if (type === 'image_to_video' || type === 'video_effects' || type === 'text_to_video') {
      return type;
    }
  }

  // 判断是否为 video-effects（通过 effectId 或 model）
  if (settings?.effectId || settings?.effectName || settings?.model === 'video-effects') {
    return 'video_effects';
  }

  // 🔥 增强判断：检查更多可能的字段名
  // 判断是否为 image_to_video（通过 image_url 等字段）
  if (
    settings?.image_url ||
    settings?.imageUrl ||
    settings?.image ||
    settings?.inputImage ||
    settings?.input_image ||
    settings?.['image-url']
  ) {
    return 'image_to_video';
  }

  // 默认为 text_to_video
  return 'text_to_video';
}

/**
 * 将 user_videos 表数据标准化为 UnifiedTask 格式
 */
function normalizeTask(rawTask: any): UnifiedTask {
  const settings = rawTask.settings || {};
  const generationType = determineGenerationType(settings);

  return {
    id: rawTask.id,
    task_type: 'video_generation',
    user_id: rawTask.user_id || null,
    user_email: rawTask.user_email || null,
    status: rawTask.status,
    progress: rawTask.download_progress || (rawTask.status === 'completed' ? 100 : 0),
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,

    // 生成类型和输入数据
    generation_type: generationType,
    input_image_url: settings.image_url || settings.imageUrl || settings.image || settings.inputImage || null,
    prompt: rawTask.prompt || '',

    // 输出数据
    video_url: rawTask.original_url || null,
    storage_path: rawTask.storage_path || null,
    thumbnail_path: rawTask.thumbnail_path || null,

    // 任务参数
    model: settings.model || null,
    duration: rawTask.duration_seconds || null,
    resolution: settings.resolution || null,
    aspectRatio: settings.aspectRatio || null,
    durationStr: settings.duration || null,
    settings: settings,

    // Video Effects 特有字段
    effectId: settings.effectId || null,
    effectName: settings.effectName || null,

    // 积分和错误
    credits_used: 0, // user_videos 表中未跟踪积分使用
    error: rawTask.error_message || null,

    // 外部任务 ID
    wavespeed_request_id: rawTask.wavespeed_request_id,
  };
}

/**
 * 将 user_images 表数据标准化为 UnifiedTask 格式
 */
function normalizeImageTask(rawTask: any): UnifiedTask {
  // 🔥 修复：转换中划线格式为下划线格式
  let generationType: GenerationType = 'text_to_image'; // 默认值
  if (rawTask.generation_type) {
    const type = rawTask.generation_type;
    if (type === 'text-to-image' || type === 'text_to_image') {
      generationType = 'text_to_image';
    } else if (type === 'image-to-image' || type === 'image_to_image') {
      generationType = 'image_to_image';
    }
  }

  return {
    id: rawTask.id,
    task_type: 'image_generation',
    user_id: rawTask.user_id || null,
    user_email: rawTask.user_email || null,
    status: rawTask.status,
    progress: rawTask.status === 'completed' ? 100 : 0,
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,

    // 生成类型和输入数据
    generation_type: generationType, // 转换后的下划线格式
    input_image_url: rawTask.source_images || null, // image_to_image 的源图
    prompt: rawTask.prompt || '',

    // 输出数据（图片没有 video_url，使用 image_url）
    video_url: null,
    image_url: rawTask.storage_url || rawTask.original_url,
    storage_path: rawTask.storage_path || null,
    thumbnail_path: null, // 图片没有缩略图

    // 任务参数
    model: rawTask.model || null,
    duration: null, // 图片没有 duration
    resolution: null, // 图片用 width x height 表示
    aspectRatio: rawTask.aspect_ratio || null,
    durationStr: null,
    settings: rawTask.metadata || {},

    // 图片特有字段
    width: rawTask.width || null,
    height: rawTask.height || null,
    upload_source: rawTask.upload_source || null,
    source_images: rawTask.source_images || null,

    // Video Effects 字段（图片没有）
    effectId: null,
    effectName: null,

    // 积分和错误
    credits_used: 0,
    error: rawTask.error_message || null,

    // 外部任务 ID
    wavespeed_request_id: rawTask.wavespeed_request_id || '',
  };
}

/**
 * 获取视频任务（支持基于游标的分页）
 */
async function fetchVideoTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { limit = 50, cursor, excludeEmail } = options;
  const supabase = getSupabaseAdminClient();

  // 构建查询 - 从 user_videos 表获取数据并 JOIN users 表获取 email
  let query = supabase
    .from('user_videos')
    .select('*, users!inner(email)')  // 使用 inner join 以便过滤 users 表
    .neq('status', 'deleted') // 排除已删除的视频
    .order('created_at', { ascending: false });

  // 应用邮箱排除过滤（模糊匹配，不区分大小写）
  if (excludeEmail && excludeEmail.trim()) {
    query = query.not('users.email', 'ilike', `%${excludeEmail.trim()}%`);
  }

  // 应用游标（只获取早于游标时间的任务）
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // 获取 limit + 1 条数据以判断是否有更多结果
  const { data, error } = await query.limit(limit + 1);

  if (error) {
    console.error('Failed to fetch video tasks:', error);
    return {
      tasks: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  // 扁平化 users 对象以获取 email
  const flattenedData = (data || []).map((item: any) => ({
    ...item,
    user_email: item.users?.email || null,
  }));

  // 标准化任务数据
  const allTasks = flattenedData.map((item) => normalizeTask(item));

  // 判断是否有更多结果
  const hasMore = allTasks.length > limit;
  const tasks = hasMore ? allTasks.slice(0, limit) : allTasks;

  // 计算下一个游标（最后一个任务的 created_at）
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return {
    tasks,
    nextCursor,
    hasMore,
  };
}

/**
 * 获取图片任务（支持基于游标的分页）
 */
async function fetchImageTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { limit = 50, cursor, excludeEmail } = options;
  const supabase = getSupabaseAdminClient();

  // 构建查询 - 从 user_images 表获取数据并 JOIN users 表获取 email
  let query = supabase
    .from('user_images')
    .select('*, users!inner(email)')
    .neq('status', 'deleted') // 排除已删除的图片
    .order('created_at', { ascending: false });

  // 应用邮箱排除过滤（模糊匹配，不区分大小写）
  if (excludeEmail && excludeEmail.trim()) {
    query = query.not('users.email', 'ilike', `%${excludeEmail.trim()}%`);
  }

  // 应用游标（只获取早于游标时间的任务）
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // 获取 limit + 1 条数据以判断是否有更多结果
  const { data, error } = await query.limit(limit + 1);

  if (error) {
    console.error('Failed to fetch image tasks:', error);
    return {
      tasks: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  // 扁平化 users 对象以获取 email
  const flattenedData = (data || []).map((item: any) => ({
    ...item,
    user_email: item.users?.email || null,
  }));

  // 标准化任务数据
  const allTasks = flattenedData.map((item) => normalizeImageTask(item));

  // 判断是否有更多结果
  const hasMore = allTasks.length > limit;
  const tasks = hasMore ? allTasks.slice(0, limit) : allTasks;

  // 计算下一个游标（最后一个任务的 created_at）
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return {
    tasks,
    nextCursor,
    hasMore,
  };
}

/**
 * 获取所有任务（合并视频和图片，支持基于游标的分页）
 */
export async function fetchAllTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { taskType } = options;

  // 根据 taskType 决定获取哪种任务
  if (taskType === 'video_generation') {
    return fetchVideoTasks(options);
  }

  if (taskType === 'image_generation') {
    return fetchImageTasks(options);
  }

  // taskType === undefined，获取所有任务（合并两个表）
  const limit = options.limit || 50;

  // 并发获取视频和图片任务
  const [videoResult, imageResult] = await Promise.all([
    fetchVideoTasks({ ...options, limit }),
    fetchImageTasks({ ...options, limit }),
  ]);

  // 合并结果并按时间排序
  const allTasks = [...videoResult.tasks, ...imageResult.tasks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 取前 limit 条
  const tasks = allTasks.slice(0, limit);

  // 判断是否有更多
  const hasMore = videoResult.hasMore || imageResult.hasMore || allTasks.length > limit;

  // 计算下一个游标
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return {
    tasks,
    nextCursor,
    hasMore,
  };
}

/**
 * 获取视频任务统计信息
 */
async function fetchVideoStats(): Promise<TaskStats> {
  const supabase = getSupabaseAdminClient();

  const [totalResult, completedResult, failedResult, processingResult] = await Promise.allSettled([
    // 总数（排除已删除）
    supabase.from('user_videos').select('id', { count: 'exact', head: true }).neq('status', 'deleted'),
    // 已完成
    supabase.from('user_videos').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    // 失败
    supabase.from('user_videos').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    // 处理中（generating + downloading + processing）
    supabase
      .from('user_videos')
      .select('id', { count: 'exact', head: true })
      .in('status', ['generating', 'downloading', 'processing']),
  ]);

  return {
    total: totalResult.status === 'fulfilled' ? totalResult.value.count || 0 : 0,
    completed: completedResult.status === 'fulfilled' ? completedResult.value.count || 0 : 0,
    failed: failedResult.status === 'fulfilled' ? failedResult.value.count || 0 : 0,
    processing: processingResult.status === 'fulfilled' ? processingResult.value.count || 0 : 0,
  };
}

/**
 * 获取图片任务统计信息
 */
async function fetchImageStats(): Promise<TaskStats> {
  const supabase = getSupabaseAdminClient();

  const [totalResult, completedResult, failedResult, processingResult] = await Promise.allSettled([
    // 总数（排除已删除）
    supabase.from('user_images').select('id', { count: 'exact', head: true }).neq('status', 'deleted'),
    // 已完成
    supabase.from('user_images').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    // 失败
    supabase.from('user_images').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    // 处理中（uploading + processing）
    supabase
      .from('user_images')
      .select('id', { count: 'exact', head: true })
      .in('status', ['uploading', 'processing']),
  ]);

  return {
    total: totalResult.status === 'fulfilled' ? totalResult.value.count || 0 : 0,
    completed: completedResult.status === 'fulfilled' ? completedResult.value.count || 0 : 0,
    failed: failedResult.status === 'fulfilled' ? failedResult.value.count || 0 : 0,
    processing: processingResult.status === 'fulfilled' ? processingResult.value.count || 0 : 0,
  };
}

/**
 * 获取任务统计信息（支持视频、图片或全部）
 */
export async function fetchTaskStats(taskType?: TaskType): Promise<TaskStats> {
  // 只统计视频任务
  if (taskType === 'video_generation') {
    return fetchVideoStats();
  }

  // 只统计图片任务
  if (taskType === 'image_generation') {
    return fetchImageStats();
  }

  // 统计所有任务（视频 + 图片）
  const [videoStats, imageStats] = await Promise.all([
    fetchVideoStats(),
    fetchImageStats(),
  ]);

  return {
    total: videoStats.total + imageStats.total,
    completed: videoStats.completed + imageStats.completed,
    failed: videoStats.failed + imageStats.failed,
    processing: videoStats.processing + imageStats.processing,
  };
}

/**
 * 获取任务类型显示标签
 */
export function getTaskTypeLabel(taskType: TaskType | 'all'): string {
  const labels: Record<TaskType | 'all', string> = {
    all: 'All Tasks',
    video_generation: 'Video Generation',
    image_generation: 'Image Generation',
  };
  return labels[taskType] || taskType;
}

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
import { parseAdminTimestamp } from '@/lib/admin/datetime';
import { attachPromptPurposeAnalyses } from '@/lib/admin/prompt-purpose-store';

const MAX_TASK_PAGE_SIZE = 100;
const DEFAULT_TASK_PAGE_SIZE = 50;

interface SourceTaskCursors {
  video: string | null;
  image: string | null;
}

function normalizeTaskLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return DEFAULT_TASK_PAGE_SIZE;
  }

  return Math.min(Math.floor(limit), MAX_TASK_PAGE_SIZE);
}

function parseExcludeEmailKeywords(excludeEmail?: string): string[] {
  return (excludeEmail || '')
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function shouldExcludeEmail(email: string | null, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return false;
  }

  const normalizedEmail = (email || '').toLowerCase();
  return keywords.some((keyword) => normalizedEmail.includes(keyword));
}

async function fetchUserEmailMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userIds: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))] as string[];

  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('users')
    .select('uuid, email')
    .in('uuid', ids);

  if (error) {
    console.error('Failed to fetch task user emails:', error);
    return new Map();
  }

  return new Map((data ?? []).map((user: any) => [user.uuid, user.email]));
}

function getFirstImageUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    return value || null;
  }

  if (Array.isArray(value)) {
    const firstString = value.find((item) => typeof item === 'string');
    return firstString || null;
  }

  return null;
}

function parseSourceTaskCursors(cursor?: string): SourceTaskCursors {
  if (!cursor) {
    return { video: null, image: null };
  }

  try {
    const parsed = JSON.parse(cursor);
    return {
      video: typeof parsed.video === 'string' ? parsed.video : null,
      image: typeof parsed.image === 'string' ? parsed.image : null,
    };
  } catch {
    // Backward compatibility for old timestamp-only cursors.
    return { video: cursor, image: cursor };
  }
}

function stringifySourceTaskCursors(cursors: SourceTaskCursors): string {
  return JSON.stringify(cursors);
}

/**
 * 判断任务的生成类型
 */
function determineGenerationType(settings: any): GenerationType {
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
    input_image_url: getFirstImageUrl(
      settings.image_url || settings.imageUrl || settings.image || settings.inputImage || null
    ),
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
    input_image_url: getFirstImageUrl(rawTask.source_images), // image_to_image 的源图
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
  const { cursor, excludeEmail } = options;
  const limit = normalizeTaskLimit(options.limit);
  const supabase = getSupabaseAdminClient() as any;
  const excludeKeywords = parseExcludeEmailKeywords(excludeEmail);
  const batchLimit = excludeKeywords.length > 0 ? Math.min(limit * 5, 500) : limit + 1;
  const rows: UnifiedTask[] = [];
  let currentCursor: string | undefined = cursor;
  let fetchedFullBatch = false;

  while (rows.length < limit + 1) {
    // 构建查询 - 先取任务，再批量映射 users.email，避免 inner join 漏掉孤儿任务
    let query = supabase
      .from('user_videos')
      .select('*')
      .neq('status', 'deleted') // 排除已删除的视频
      .order('created_at', { ascending: false });

    // 应用游标（只获取早于游标时间的任务）
    if (currentCursor) {
      query = query.lt('created_at', currentCursor);
    }

    // 获取 limit + 1 条数据以判断是否有更多结果
    const { data, error } = await query.limit(batchLimit);

    if (error) {
      console.error('Failed to fetch video tasks:', error);
      return {
        tasks: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const page = data ?? [];
    fetchedFullBatch = page.length === batchLimit;
    const emailMap = await fetchUserEmailMap(supabase, page.map((item: any) => item.user_id));

    page
      .map((item: any) =>
        normalizeTask({
          ...item,
          user_email: item.user_id ? emailMap.get(item.user_id) ?? null : null,
        })
      )
      .filter((task: UnifiedTask) => !shouldExcludeEmail(task.user_email, excludeKeywords))
      .forEach((task: UnifiedTask) => rows.push(task));

    if (!fetchedFullBatch) {
      break;
    }

    currentCursor = page[page.length - 1]?.created_at ?? undefined;

    if (!currentCursor) {
      break;
    }
  }

  const tasks = rows.slice(0, limit);
  const hasMore = rows.length > limit || (tasks.length > 0 && fetchedFullBatch);
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
  const { cursor, excludeEmail } = options;
  const limit = normalizeTaskLimit(options.limit);
  const supabase = getSupabaseAdminClient() as any;
  const excludeKeywords = parseExcludeEmailKeywords(excludeEmail);
  const batchLimit = excludeKeywords.length > 0 ? Math.min(limit * 5, 500) : limit + 1;
  const rows: UnifiedTask[] = [];
  let currentCursor: string | undefined = cursor;
  let fetchedFullBatch = false;

  while (rows.length < limit + 1) {
    // 构建查询 - 先取任务，再批量映射 users.email，避免 inner join 漏掉孤儿任务
    let query = supabase
      .from('user_images')
      .select('*')
      .neq('status', 'deleted') // 排除已删除的图片
      .order('created_at', { ascending: false });

    // 应用游标（只获取早于游标时间的任务）
    if (currentCursor) {
      query = query.lt('created_at', currentCursor);
    }

    // 获取 limit + 1 条数据以判断是否有更多结果
    const { data, error } = await query.limit(batchLimit);

    if (error) {
      console.error('Failed to fetch image tasks:', error);
      return {
        tasks: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const page = data ?? [];
    fetchedFullBatch = page.length === batchLimit;
    const emailMap = await fetchUserEmailMap(supabase, page.map((item: any) => item.user_id));

    page
      .map((item: any) =>
        normalizeImageTask({
          ...item,
          user_email: item.user_id ? emailMap.get(item.user_id) ?? null : null,
        })
      )
      .filter((task: UnifiedTask) => !shouldExcludeEmail(task.user_email, excludeKeywords))
      .forEach((task: UnifiedTask) => rows.push(task));

    if (!fetchedFullBatch) {
      break;
    }

    currentCursor = page[page.length - 1]?.created_at ?? undefined;

    if (!currentCursor) {
      break;
    }
  }

  const tasks = rows.slice(0, limit);
  const hasMore = rows.length > limit || (tasks.length > 0 && fetchedFullBatch);
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
  const limit = normalizeTaskLimit(options.limit);

  // 根据 taskType 决定获取哪种任务
  if (taskType === 'video_generation') {
    const result = await fetchVideoTasks({ ...options, limit });
    return {
      ...result,
      tasks: await attachPromptPurposeAnalyses(result.tasks),
    };
  }

  if (taskType === 'image_generation') {
    const result = await fetchImageTasks({ ...options, limit });
    return {
      ...result,
      tasks: await attachPromptPurposeAnalyses(result.tasks),
    };
  }

  // taskType === undefined，获取所有任务（合并两个表）
  const sourceCursors = parseSourceTaskCursors(options.cursor);

  // 并发获取视频和图片任务
  const [videoResult, imageResult] = await Promise.all([
    fetchVideoTasks({ ...options, cursor: sourceCursors.video ?? undefined, limit }),
    fetchImageTasks({ ...options, cursor: sourceCursors.image ?? undefined, limit }),
  ]);

  // 合并结果并按时间排序
  const allTasks = [...videoResult.tasks, ...imageResult.tasks].sort(
    (a, b) =>
      (parseAdminTimestamp(b.created_at)?.getTime() ?? 0) -
      (parseAdminTimestamp(a.created_at)?.getTime() ?? 0)
  );

  // 取前 limit 条
  const tasks = allTasks.slice(0, limit);
  const lastVideoTask = [...tasks].reverse().find((task) => task.task_type === 'video_generation');
  const lastImageTask = [...tasks].reverse().find((task) => task.task_type === 'image_generation');
  const nextSourceCursors = {
    video: lastVideoTask?.created_at ?? sourceCursors.video,
    image: lastImageTask?.created_at ?? sourceCursors.image,
  };

  // 判断是否有更多
  const hasMore =
    tasks.length === limit &&
    (videoResult.hasMore || imageResult.hasMore || allTasks.length > limit);
  const nextCursor = hasMore ? stringifySourceTaskCursors(nextSourceCursors) : null;

  return {
    tasks: await attachPromptPurposeAnalyses(tasks),
    nextCursor,
    hasMore,
  };
}

/**
 * 获取视频任务统计信息
 */
async function fetchVideoStats(): Promise<TaskStats> {
  const supabase = getSupabaseAdminClient() as any;

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
  const supabase = getSupabaseAdminClient() as any;

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

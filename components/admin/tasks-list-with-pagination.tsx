/**
 * Tasks List with Pagination Component
 * Client-side component for displaying tasks with infinite scroll
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PromptPurposeCategory,
  UnifiedTask,
  TaskType,
  TaskStats,
} from '@/types/admin/tasks';
import { Table as TableSlotType } from '@/types/slots/table';
import TableSlot from '@/components/dashboard/slots/table';
import MediaPreview from './media-preview';
import { getTaskTypeLabel } from '@/lib/admin/task-labels';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Film,
  ImageIcon,
  Sparkles,
  Type,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ADMIN_STATS_TIMEZONE_LABEL,
  formatAdminDateTime,
  formatAdminUtcTitle,
} from '@/lib/admin/datetime';

interface TasksListProps {
  initialTasks: UnifiedTask[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  taskType?: TaskType;
  stats: TaskStats;
}

const purposeCategoryStyles: Record<PromptPurposeCategory, string> = {
  marketing_ad: 'bg-rose-50 text-rose-700 border-rose-200',
  product_showcase: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  social_content: 'bg-blue-50 text-blue-700 border-blue-200',
  storytelling: 'bg-violet-50 text-violet-700 border-violet-200',
  education_tutorial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  entertainment_meme: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  personal_memory: 'bg-amber-50 text-amber-700 border-amber-200',
  character_avatar: 'bg-purple-50 text-purple-700 border-purple-200',
  scene_visualization: 'bg-sky-50 text-sky-700 border-sky-200',
  fashion_beauty: 'bg-pink-50 text-pink-700 border-pink-200',
  music_dance: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  game_anime: 'bg-lime-50 text-lime-700 border-lime-200',
  business_presentation: 'bg-slate-100 text-slate-700 border-slate-200',
  image_editing_request: 'bg-teal-50 text-teal-700 border-teal-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

function formatPurposeConfidence(confidence: number): string {
  if (!Number.isFinite(confidence) || confidence <= 0) {
    return '';
  }

  return `${Math.round(confidence * 100)}%`;
}

async function parseJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  if (!contentType.includes('application/json')) {
    const message = rawText.replace(/\s+/g, ' ').trim().slice(0, 220);
    throw new Error(
      response.ok
        ? `Unexpected server response: ${message}`
        : `Request failed (${response.status}): ${message}`
    );
  }

  try {
    return JSON.parse(rawText);
  } catch {
    const message = rawText.replace(/\s+/g, ' ').trim().slice(0, 220);
    throw new Error(`Invalid JSON response (${response.status}): ${message}`);
  }
}

export default function TasksListWithPagination({
  initialTasks,
  initialNextCursor,
  initialHasMore,
  taskType,
  stats,
}: TasksListProps) {
  const [tasks, setTasks] = useState<UnifiedTask[]>(initialTasks);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 邮箱排除搜索
  const [excludeEmailInput, setExcludeEmailInput] = useState('');
  const [excludeEmail, setExcludeEmail] = useState('');
  const [isInitialMount, setIsInitialMount] = useState(true);

  /**
   * 防抖：输入停止 300ms 后更新搜索关键词
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setExcludeEmail(excludeEmailInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [excludeEmailInput]);

  /**
   * 当搜索关键词变化时，重新加载数据
   */
  const fetchTasks = useCallback(async (excludeKeyword: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (taskType) {
        params.set('type', taskType);
      }
      if (excludeKeyword) {
        params.set('excludeEmail', excludeKeyword);
      }

      const response = await fetch(`/api/admin/tasks?${params.toString()}`);
      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      setErrorMessage(null);
      setTasks(data.tasks);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [taskType]);

  useEffect(() => {
    // 跳过初始挂载，避免不必要的 API 调用
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }

    // 当 excludeEmail 变化时，重新加载数据
    fetchTasks(excludeEmail);
  }, [excludeEmail, fetchTasks, isInitialMount]);

  /**
   * Load more tasks
   */
  const loadMore = async () => {
    if (!hasMore || loading || !nextCursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cursor: nextCursor,
      });
      if (taskType) {
        params.set('type', taskType);
      }
      if (excludeEmail) {
        params.set('excludeEmail', excludeEmail);
      }

      const response = await fetch(`/api/admin/tasks?${params.toString()}`);
      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load more tasks');
      }

      setErrorMessage(null);
      setTasks((prev) => [...prev, ...data.tasks]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more tasks:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load more tasks');
    } finally {
      setLoading(false);
    }
  };

  const renderPromptPurpose = (item: UnifiedTask) => {
    if (!item.prompt?.trim()) {
      return <span className="text-xs text-gray-400">No text prompt</span>;
    }

    const purpose = item.prompt_purpose;
    if (!purpose) {
      return (
        <span className="inline-flex w-fit items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
          Not analyzed
        </span>
      );
    }

    if (purpose.status === 'failed') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-fit cursor-help items-center rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                Analysis failed
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm whitespace-pre-wrap">
                {purpose.error_message || 'Prompt purpose analysis failed.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (purpose.status !== 'completed') {
      return (
        <span className="inline-flex w-fit items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {purpose.status}
        </span>
      );
    }

    const confidence = formatPurposeConfidence(purpose.confidence);
    const style = purposeCategoryStyles[purpose.category] || purposeCategoryStyles.other;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex max-w-44 cursor-help flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex w-fit rounded border px-2 py-0.5 text-xs font-semibold ${style}`}>
                  {purpose.label}
                </span>
                {confidence && <span className="text-[11px] text-slate-500">{confidence}</span>}
              </div>
              {purpose.tags.length > 0 && (
                <span className="line-clamp-1 text-[11px] text-slate-500">
                  {purpose.tags.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{purpose.label}</p>
              {purpose.summary && (
                <p className="text-sm whitespace-pre-wrap">{purpose.summary}</p>
              )}
              {purpose.tags.length > 0 && (
                <p className="text-xs text-slate-500">Tags: {purpose.tags.join(', ')}</p>
              )}
              {purpose.model && (
                <p className="text-xs text-slate-400">Model: {purpose.model}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Define table columns
  const table: TableSlotType = {
    title: taskType ? `${getTaskTypeLabel(taskType)} Tasks` : 'All Tasks',
    description: `Total: ${stats.total} | Completed: ${stats.completed} | Failed: ${stats.failed} | Processing: ${stats.processing}`,
    columns: [
      {
        name: 'generation_type',
        title: 'Generation Type',
        className: 'w-36',
        callback: (item: UnifiedTask) => {
          let color: string;
          let Icon = Type;
          let label: string;

          switch (item.generation_type) {
            case 'image_to_video':
              color = 'bg-purple-100 text-purple-800 border-purple-200';
              Icon = Film;
              label = 'Image to Video';
              break;
            case 'video_effects':
              color = 'bg-pink-100 text-pink-800 border-pink-200';
              Icon = Sparkles;
              label = 'Video Effects';
              break;
            case 'text_to_image':
              color = 'bg-orange-100 text-orange-800 border-orange-200';
              Icon = ImageIcon;
              label = 'Text to Image';
              break;
            case 'image_to_image':
              color = 'bg-cyan-100 text-cyan-800 border-cyan-200';
              Icon = Wand2;
              label = 'Image to Image';
              break;
            case 'text_to_video':
            default:
              color = 'bg-blue-100 text-blue-800 border-blue-200';
              Icon = Type;
              label = 'Text to Video';
              break;
          }

          return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${color} whitespace-nowrap inline-flex items-center gap-1`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </span>
          );
        },
      },
      {
        name: 'user_email',
        title: 'User',
        className: 'w-40',
        callback: (item: UnifiedTask) => {
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{item.user_email || 'N/A'}</span>
              {item.user_id && (
                <span className="text-xs text-gray-400 font-mono">{item.user_id.substring(0, 8)}...</span>
              )}
            </div>
          );
        },
      },
      {
        name: 'input_image',
        title: 'Input Image',
        className: 'w-28',
        callback: (item: UnifiedTask) => {
          if (item.input_image_url) {
            return <MediaPreview src={item.input_image_url} type="image" alt="Input Image" placeholder="No image" />;
          }
          return <span className="text-gray-400 text-xs">-</span>;
        },
      },
      {
        name: 'prompt',
        title: 'Prompt / Effect',
        className: 'w-48',
        callback: (item: UnifiedTask) => {
          // 如果是 video-effects，优先显示特效名称
          if (item.generation_type === 'video_effects' && item.effectName) {
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-pink-50 text-pink-700 border border-pink-200">
                  {item.effectName}
                </span>
              </div>
            );
          }

          if (!item.prompt) {
            return <span className="text-gray-400 text-xs">-</span>;
          }

          const short = item.prompt.substring(0, 50);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <span className="text-xs text-gray-700 line-clamp-2">
                      {short}{item.prompt.length > 50 ? '...' : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p className="text-sm whitespace-pre-wrap">{item.prompt}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        name: 'parameters',
        title: 'Parameters',
        className: 'w-40',
        callback: (item: UnifiedTask) => {
          // 如果是图片任务，显示宽高
          if (item.task_type === 'image_generation') {
            return (
              <div className="flex flex-col gap-1 text-xs">
                {/* 宽高 */}
                {item.width && item.height && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Size:</span>
                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
                      {item.width} × {item.height}
                    </span>
                  </div>
                )}

                {/* Aspect Ratio */}
                {item.aspectRatio && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Ratio:</span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                      {item.aspectRatio}
                    </span>
                  </div>
                )}

                {/* 如果都没有，显示占位符 */}
                {!item.width && !item.height && !item.aspectRatio && (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            );
          }

          // 视频任务逻辑（现有）
          return (
            <div className="flex flex-col gap-1 text-xs">
              {/* Duration */}
              {item.durationStr && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 font-medium">Duration:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    {item.durationStr}
                  </span>
                </div>
              )}

              {/* Resolution */}
              {item.resolution && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 font-medium">Res:</span>
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
                    {item.resolution}
                  </span>
                </div>
              )}

              {/* Aspect Ratio */}
              {item.aspectRatio && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 font-medium">Ratio:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                    {item.aspectRatio}
                  </span>
                </div>
              )}

              {/* 如果都没有，显示占位符 */}
              {!item.durationStr && !item.resolution && !item.aspectRatio && (
                <span className="text-gray-400">-</span>
              )}
            </div>
          );
        },
      },
      {
        name: 'result',
        title: 'Result',
        className: 'w-32',
        callback: (item: UnifiedTask) => {
          // 如果是图片任务，显示图片
          if (item.task_type === 'image_generation' && item.image_url) {
            return <MediaPreview src={item.image_url} type="image" alt="Result Image" placeholder="No result" />;
          }

          // 视频任务逻辑（现有）
          const resultUrl = item.video_url || item.result_url || item.audio_url;
          if (!resultUrl) {
            return <span className="text-gray-400 text-xs">No result</span>;
          }

          const isVideo = item.video_url || item.result_url;
          const isAudio = item.audio_url;

          if (isAudio) {
            return (
              <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                <Volume2 className="mr-1 inline h-3.5 w-3.5" />
                Audio
              </a>
            );
          }

          return <MediaPreview src={resultUrl} type="video" alt="Result Video" placeholder="No result" />;
        },
      },
      {
        name: 'status',
        title: 'Status',
        className: 'w-28',
        callback: (item: UnifiedTask) => {
          const statusColors = {
            uploading: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            generating: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            downloading: 'bg-blue-100 text-blue-800 border-blue-200',
            processing: 'bg-purple-100 text-purple-800 border-purple-200',
            completed: 'bg-green-100 text-green-800 border-green-200',
            failed: 'bg-red-100 text-red-800 border-red-200',
            deleted: 'bg-gray-100 text-gray-500 border-gray-200',
          };
          const color = statusColors[item.status] || 'bg-gray-100 text-gray-800 border-gray-200';

          return (
            <div className="flex flex-col gap-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color} inline-block w-fit`}>
                {item.status.toUpperCase()}
              </span>
              {item.progress > 0 && item.progress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        name: 'model',
        title: 'Model',
        className: 'w-24',
        callback: (item: UnifiedTask) => {
          if (!item.model) {
            return <span className="text-gray-400 text-xs">-</span>;
          }
          return <span className="text-xs font-mono text-gray-700">{item.model}</span>;
        },
      },
      {
        name: 'created_at',
        title: `Created (${ADMIN_STATS_TIMEZONE_LABEL})`,
        className: 'w-36',
        callback: (item: UnifiedTask) => {
          return (
            <span
              className="text-xs text-gray-600"
              title={formatAdminUtcTitle(item.created_at)}
            >
              {formatAdminDateTime(item.created_at)}
            </span>
          );
        },
      },
      {
        name: 'prompt_purpose',
        title: 'AI Purpose',
        className: 'w-44',
        callback: renderPromptPurpose,
      },
      {
        name: 'error',
        title: 'Error',
        className: 'max-w-xs',
        callback: (item: UnifiedTask) => {
          if (!item.error) return <span className="text-gray-400 text-xs">-</span>;

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-red-600 cursor-help truncate block">
                    {item.error.substring(0, 30)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p className="text-sm whitespace-pre-wrap">{item.error}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
    ],
    data: tasks,
    empty_message: tasks.length === 0 ? 'No tasks yet. Tasks will appear here when users create them.' : 'Failed to load tasks. Please refresh.',
  };

  return (
    <div>
      {/* 邮箱排除搜索框 */}
      <div className="mb-6 space-y-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-72 flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Enter keywords to exclude (comma-separated, e.g. teamone, test, example)..."
              value={excludeEmailInput}
              onChange={(e) => setExcludeEmailInput(e.target.value)}
              className="pr-8"
            />
            {excludeEmailInput && (
              <button
                onClick={() => setExcludeEmailInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {excludeEmail && (
            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
              <span>Excluding:</span>
              {excludeEmail.split(',').map((keyword, index) => {
                const trimmed = keyword.trim();
                if (!trimmed) return null;
                return (
                  <span key={index} className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-xs border border-red-200">
                    {trimmed}
                  </span>
                );
              })}
            </div>
          )}
          {loading && excludeEmail && (
            <span className="text-sm text-blue-500">Loading...</span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <TableSlot {...table} />

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6 mb-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* All Data Loaded Message */}
      {!hasMore && tasks.length > 0 && (
        <div className="text-center text-sm text-gray-500 mt-6 mb-8">
          Loaded all {tasks.length} tasks
        </div>
      )}
    </div>
  );
}

/**
 * Tasks List with Pagination Component
 * Client-side component for displaying tasks with infinite scroll
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedTask, TaskType, TaskStats } from '@/types/admin/tasks';
import { Table as TableSlotType } from '@/types/slots/table';
import TableSlot from '@/components/dashboard/slots/table';
import MediaPreview from './media-preview';
import { getTaskTypeLabel } from '@/lib/admin/all-tasks-fetcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TasksListProps {
  initialTasks: UnifiedTask[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  taskType?: TaskType;
  stats: TaskStats;
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
      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
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
      const data = await response.json();

      if (data.success) {
        setTasks((prev) => [...prev, ...data.tasks]);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more tasks:', error);
    } finally {
      setLoading(false);
    }
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
          let icon: string;
          let label: string;

          switch (item.generation_type) {
            case 'image_to_video':
              color = 'bg-purple-100 text-purple-800 border-purple-200';
              icon = '🖼️';
              label = 'Image to Video';
              break;
            case 'video_effects':
              color = 'bg-pink-100 text-pink-800 border-pink-200';
              icon = '✨';
              label = 'Video Effects';
              break;
            case 'text_to_image':
              color = 'bg-orange-100 text-orange-800 border-orange-200';
              icon = '🎨';
              label = 'Text to Image';
              break;
            case 'image_to_image':
              color = 'bg-cyan-100 text-cyan-800 border-cyan-200';
              icon = '🖌️';
              label = 'Image to Image';
              break;
            case 'text_to_video':
            default:
              color = 'bg-blue-100 text-blue-800 border-blue-200';
              icon = '✍️';
              label = 'Text to Video';
              break;
          }

          return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${color} whitespace-nowrap inline-flex items-center gap-1`}>
              <span>{icon}</span>
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
                  ✨ {item.effectName}
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
                🔊 Audio
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
        title: 'Created',
        className: 'w-36',
        callback: (item: UnifiedTask) => {
          const date = new Date(item.created_at);
          return (
            <span className="text-xs text-gray-600">
              {date.toLocaleDateString()} {date.toLocaleTimeString()}
            </span>
          );
        },
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
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Enter email keyword to exclude..."
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
          <span className="text-sm text-gray-500">
            Excluding emails containing: <span className="font-semibold text-red-600">{excludeEmail}</span>
          </span>
        )}
        {loading && excludeEmail && (
          <span className="text-sm text-blue-500">Loading...</span>
        )}
      </div>

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

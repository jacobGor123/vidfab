/**
 * Tasks List with Pagination Component
 * Client-side component for displaying tasks with infinite scroll
 */

'use client';

import React, { useState } from 'react';
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
    title: `${taskType ? getTaskTypeLabel(taskType) + ' - ' : ''}Task Management (Total: ${stats.total} | Completed: ${stats.completed} | Failed: ${stats.failed} | Processing: ${stats.processing})`,
    columns: [
      {
        name: 'task_type',
        title: 'Type',
        className: 'w-24',
        callback: (item: UnifiedTask) => {
          const colors: Record<TaskType, string> = {
            video_generation: 'bg-blue-100 text-blue-800 border-blue-200',
            audio_generation: 'bg-orange-100 text-orange-800 border-orange-200',
            watermark_removal: 'bg-purple-100 text-purple-800 border-purple-200',
            video_upscaler: 'bg-green-100 text-green-800 border-green-200',
            video_effects: 'bg-pink-100 text-pink-800 border-pink-200',
            face_swap: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          };
          const color = colors[item.task_type] || 'bg-gray-100 text-gray-800 border-gray-200';
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${color} whitespace-nowrap`}>
              {getTaskTypeLabel(item.task_type)}
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
        name: 'input_content',
        title: 'Input',
        className: 'w-32',
        callback: (item: UnifiedTask) => {
          if (item.input_image_url || item.face_image_url) {
            return <MediaPreview src={item.input_image_url || item.face_image_url} type="image" alt="Input Image" placeholder="No image" />;
          }
          if (item.input_video_url) {
            return <MediaPreview src={item.input_video_url} type="video" alt="Input Video" placeholder="No video" />;
          }
          if (item.prompt) {
            const short = item.prompt.substring(0, 30);
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="text-xs text-gray-600 line-clamp-2">
                        {short}{item.prompt.length > 30 ? '...' : ''}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-sm whitespace-pre-wrap">{item.prompt}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span className="text-gray-400 text-xs">-</span>;
        },
      },
      {
        name: 'result',
        title: 'Result',
        className: 'w-32',
        callback: (item: UnifiedTask) => {
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
        className: 'w-24',
        callback: (item: UnifiedTask) => {
          const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            processing: 'bg-blue-100 text-blue-800 border-blue-200',
            completed: 'bg-green-100 text-green-800 border-green-200',
            failed: 'bg-red-100 text-red-800 border-red-200',
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
        name: 'credits_used',
        title: 'Credits',
        className: 'w-16 text-right',
        callback: (item: UnifiedTask) => {
          return <span className="text-sm font-mono">{item.credits_used}</span>;
        },
      },
      {
        name: 'created_at',
        title: 'Created',
        className: 'w-32',
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
      <TableSlot {...table} />

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6 mb-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

/**
 * Tasks Admin Page
 * Displays all tasks with filtering and pagination
 */

import React from 'react';
import { fetchAllTasks, fetchTaskStats } from '@/lib/admin/all-tasks-fetcher';
import { TaskType } from '@/types/admin/tasks';
import TasksListWithPagination from '@/components/admin/tasks-list-with-pagination';
import TaskTypeFilter from '@/components/admin/task-type-filter';
import AdminPageHeader from '@/components/admin/admin-page-header';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Note: Removed edge runtime - NextAuth requires Node.js runtime

interface TasksPageProps {
  searchParams: {
    type?: string;
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const taskType =
    searchParams.type === 'video_generation' || searchParams.type === 'image_generation'
      ? (searchParams.type as TaskType)
      : undefined;

  const [{ tasks, nextCursor, hasMore }, stats] = await Promise.all([
    fetchAllTasks({
      taskType,
      limit: 50,
    }),
    fetchTaskStats(taskType),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tasks"
        description="Unified generation task stream across video and image tables."
        meta={
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {stats.total} total
          </span>
        }
      />

      <TaskTypeFilter currentType={taskType || 'all'} />

      {/* Tasks List */}
      <TasksListWithPagination
        initialTasks={tasks}
        initialNextCursor={nextCursor}
        initialHasMore={hasMore}
        taskType={taskType}
        stats={stats}
      />
    </div>
  );
}

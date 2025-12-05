/**
 * Tasks Admin Page
 * Displays all tasks with filtering and pagination
 */

import React from 'react';
import { fetchAllTasks, fetchTaskStats } from '@/lib/admin/all-tasks-fetcher';
import { TaskType } from '@/types/admin/tasks';
import TasksListWithPagination from '@/components/admin/tasks-list-with-pagination';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Note: Removed edge runtime - NextAuth requires Node.js runtime

interface TasksPageProps {
  searchParams: {
    type?: TaskType;
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const taskType = searchParams.type;

  // Fetch tasks and statistics
  const { tasks, nextCursor, hasMore } = await fetchAllTasks({
    taskType,
    limit: 50,
  });

  const stats = await fetchTaskStats(taskType);

  return (
    <div className="space-y-6">
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

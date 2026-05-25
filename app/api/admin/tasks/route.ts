/**
 * Admin Tasks API Route
 * Provides paginated tasks data for client-side loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllTasks } from '@/lib/admin/all-tasks-fetcher';
import { TaskType } from '@/types/admin/tasks';
import { requireAdmin } from '@/lib/admin/auth';

// Note: Removed edge runtime - NextAuth requires Node.js runtime

// 标记为动态路由（使用 requireAdmin 需要 headers 和 searchParams）
export const dynamic = 'force-dynamic';

const VALID_TASK_TYPES = new Set<TaskType>([
  'video_generation',
  'image_generation',
]);

function parseLimit(value: string | null): number {
  const parsed = Number(value || '50');
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 50;
  }
  return Math.min(Math.floor(parsed), 100);
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const rawTaskType = searchParams.get('type');
    const taskType = rawTaskType as TaskType | undefined;
    const limit = parseLimit(searchParams.get('limit'));
    const excludeEmail = searchParams.get('excludeEmail') || undefined;

    if (rawTaskType && !VALID_TASK_TYPES.has(rawTaskType as TaskType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task type',
        },
        { status: 400 }
      );
    }

    const result = await fetchAllTasks({
      taskType,
      limit,
      cursor,
      excludeEmail,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);

    // Check if it's an authorization error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      { status: 500 }
    );
  }
}

/**
 * Admin Tasks API Route
 * Provides paginated tasks data for client-side loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllTasks } from '@/lib/admin/all-tasks-fetcher';
import { TaskType } from '@/types/admin/tasks';
import { requireAdmin } from '@/lib/admin/auth';

// Note: Removed edge runtime - NextAuth requires Node.js runtime

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const taskType = searchParams.get('type') as TaskType | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await fetchAllTasks({
      taskType,
      limit,
      cursor,
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

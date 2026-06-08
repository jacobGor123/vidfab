import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { analyzeRecentPromptPurposes } from '@/lib/admin/prompt-purpose-analyzer';
import type { TaskType } from '@/types/admin/tasks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_TASK_TYPES = new Set<TaskType>([
  'video_generation',
  'image_generation',
]);

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const taskType = body.taskType as TaskType | undefined;

    if (taskType && !VALID_TASK_TYPES.has(taskType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task type',
        },
        { status: 400 }
      );
    }

    const result = await analyzeRecentPromptPurposes({
      days: parseNumber(body.days),
      limit: parseNumber(body.limit),
      taskType,
      force: body.force === true,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to analyze prompt purposes:', error);

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
        error: error instanceof Error ? error.message : 'Failed to analyze prompt purposes',
      },
      { status: 500 }
    );
  }
}

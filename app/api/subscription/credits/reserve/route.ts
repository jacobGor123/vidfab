/**
 * Credits预扣API - 在视频生成开始前预扣积分
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { CreditsManager } from '@/lib/subscription/credits-manager';
import { z } from 'zod';

const reserveCreditsSchema = z.object({
  model: z.string(),
  resolution: z.string(),
  duration: z.string(),
  video_job_id: z.string().uuid().optional(),
});

const creditsManager = new CreditsManager();

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份 - 统一使用NextAuth 4.x方式
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      console.error('❌ Credits reserve: Authentication failed');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.user.uuid) {
      console.error('❌ Credits reserve: User UUID missing');
      return NextResponse.json(
        { success: false, error: 'User UUID required' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const { model, resolution, duration, video_job_id } = reserveCreditsSchema.parse(body);

    // 预扣积分
    const reservationId = await creditsManager.reserveCredits(
      session.user.uuid,
      model,
      resolution,
      duration,
      video_job_id
    );

    return NextResponse.json({
      success: true,
      reservation_id: reservationId,
      message: 'Credits reserved successfully',
    });

  } catch (error: any) {
    console.error('Error reserving credits:', error);

    // 处理特定的业务逻辑错误
    if (error.message.includes('Insufficient credits')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS'
        },
        { status: 402 } // Payment Required
      );
    }

    if (error.message.includes('Concurrent job limit exceeded')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'CONCURRENT_LIMIT_EXCEEDED'
        },
        { status: 429 } // Too Many Requests
      );
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Credits reservation endpoint',
    method: 'POST',
    description: 'Reserve credits before starting video generation to ensure availability',
    body: {
      model: 'AI model name (required)',
      resolution: 'Video resolution (required)',
      duration: 'Video duration (required)',
      video_job_id: 'UUID of the video job (optional)',
    },
    response: {
      success: 'boolean',
      reservation_id: 'UUID - use this to consume or release credits later',
      message: 'Success message',
    },
    error_codes: {
      INSUFFICIENT_CREDITS: 'User does not have enough credits',
      CONCURRENT_LIMIT_EXCEEDED: 'User has reached maximum concurrent jobs',
    }
  });
}
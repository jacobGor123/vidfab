/**
 * Credits释放API - 视频生成失败时返还预扣的积分
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { CreditsManager } from '@/lib/subscription/credits-manager';
import { z } from 'zod';

const releaseCreditsSchema = z.object({
  reservation_id: z.string().uuid(),
  reason: z.string().optional(),
});

const creditsManager = new CreditsManager();

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const { reservation_id, reason } = releaseCreditsSchema.parse(body);

    // 释放积分
    const success = await creditsManager.releaseCredits(reservation_id, reason);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to release credits or reservation not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credits released successfully',
    });

  } catch (error: any) {
    console.error('Error releasing credits:', error);

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
    message: 'Credits release endpoint',
    method: 'POST',
    description: 'Release reserved credits when video generation fails',
    body: {
      reservation_id: 'UUID of the reservation to release (required)',
      reason: 'Reason for release (optional)',
    },
    response: {
      success: 'boolean',
      message: 'Success message',
    }
  });
}
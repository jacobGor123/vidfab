/**
 * Credits消费API - 视频生成成功后实际扣除积分
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { CreditsManager } from '@/lib/subscription/credits-manager';
import { z } from 'zod';

const consumeCreditsSchema = z.object({
  reservation_id: z.string().uuid(),
  actual_credits_used: z.number().int().positive().optional(),
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
    const { reservation_id, actual_credits_used } = consumeCreditsSchema.parse(body);

    // 消费积分
    const result = await creditsManager.consumeCredits(
      reservation_id,
      actual_credits_used
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      credits_consumed: result.credits_consumed,
      credits_remaining: result.credits_remaining,
      message: 'Credits consumed successfully',
    });

  } catch (error: any) {
    console.error('Error consuming credits:', error);

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
    message: 'Credits consumption endpoint',
    method: 'POST',
    description: 'Consume reserved credits after successful video generation',
    body: {
      reservation_id: 'UUID of the reservation (required)',
      actual_credits_used: 'Actual credits used (optional, defaults to reserved amount)',
    },
    response: {
      success: 'boolean',
      credits_consumed: 'number - actual credits deducted',
      credits_remaining: 'number - user remaining balance',
      message: 'Success message',
    }
  });
}
/**
 * Credits可用性检查API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { CreditsManager } from '@/lib/subscription/credits-manager';
import { z } from 'zod';

const checkCreditsSchema = z.object({
  model: z.string(),
  resolution: z.string(),
  duration: z.string(),
});

const creditsManager = new CreditsManager();

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);

    if (!session?.user) {
      console.error('❌ Authentication failed: No session or user')

      // 开发环境降级处理
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          can_afford: true,
          current_balance: 1300,
          required_credits: 50,
          remaining_jobs: 26,
          warning_level: 'none',
          concurrent_info: {
            current_running: 0,
            max_allowed: 4,
            can_start_new: true,
          },
          model_access: {
            model: 'veo3-fast',
            user_plan: 'pro',
            can_access: true,
          },
          dev_mode: true,
          message: "Authentication failed - returning mock data for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      console.error('❌ Authentication failed: User UUID/ID missing')

      // 开发环境降级处理
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          can_afford: true,
          current_balance: 1300,
          required_credits: 50,
          remaining_jobs: 26,
          warning_level: 'none',
          concurrent_info: {
            current_running: 0,
            max_allowed: 4,
            can_start_new: true,
          },
          model_access: {
            model: 'veo3-fast',
            user_plan: 'pro',
            can_access: true,
          },
          dev_mode: true,
          message: "User UUID missing - returning mock data for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: 'User UUID missing' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const { model, resolution, duration } = checkCreditsSchema.parse(body);

    // 检查模型访问权限
    const modelAccess = await creditsManager.checkModelAccess(
      userId,
      model,
      resolution,
      session.user.email // 🔥 传递用户邮箱作为备用查找方式
    );

    if (!modelAccess.can_access) {
      return NextResponse.json({
        success: false,
        can_afford: false,
        error: modelAccess.reason,
        upgrade_required: true,
      });
    }

    // 检查并发任务限制
    const concurrentCheck = await creditsManager.checkConcurrentJobs(
      userId,
      session.user.email // 🔥 传递用户邮箱作为备用查找方式
    );
    if (!concurrentCheck.can_start) {
      return NextResponse.json({
        success: false,
        can_afford: false,
        error: `Concurrent job limit exceeded. Max: ${concurrentCheck.max_allowed}, Current: ${concurrentCheck.current_running}`,
        concurrent_limit_exceeded: true,
      });
    }

    // 检查积分可用性
    const budgetInfo = await creditsManager.checkCreditsAvailability(
      userId,
      model,
      resolution,
      duration,
      session.user.email // 🔥 传递用户邮箱作为备用查找方式
    );

    return NextResponse.json({
      success: true,
      can_afford: budgetInfo.can_afford,
      current_balance: budgetInfo.current_balance,
      required_credits: budgetInfo.required_credits,
      remaining_jobs: budgetInfo.remaining_jobs,
      warning_level: budgetInfo.warning_level,
      concurrent_info: {
        current_running: concurrentCheck.current_running,
        max_allowed: concurrentCheck.max_allowed,
        can_start_new: concurrentCheck.can_start,
      },
      model_access: {
        model,
        user_plan: modelAccess.user_plan,
        can_access: modelAccess.can_access,
      },
    });

  } catch (error: any) {
    console.error('Error checking credits availability:', error);

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
    message: 'Credits availability check endpoint',
    method: 'POST',
    body: {
      model: 'AI model name (e.g., seedance-v1-pro-t2v, veo3-fast, video-effects)',
      resolution: 'Video resolution (e.g., 480p, 720p, 1080p)',
      duration: 'Video duration (e.g., 5s, 10s, 8s, 4s)',
    },
    response: {
      success: 'boolean',
      can_afford: 'boolean - whether user has enough credits',
      current_balance: 'number - user current credits balance',
      required_credits: 'number - credits needed for this operation',
      remaining_jobs: 'number - how many more jobs user can do',
      warning_level: 'none | low | critical - balance warning level',
      upgrade_required: 'boolean - whether user needs to upgrade plan',
      concurrent_limit_exceeded: 'boolean - whether concurrent job limit is exceeded'
    }
  });
}
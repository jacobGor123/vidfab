/**
 * 测试购买流程 API
 * 模拟 webhook 处理，用于调试购买后状态未更新的问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { getUserByUuid, updateUser } from '@/services/user';
import { getIsoTimestr } from '@/lib/time';

// 套餐积分配置
const PLAN_CREDITS: Record<string, number> = {
  'lite': 300,
  'pro': 2000,
  'premium': 5000,
};

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

    const body = await req.json();
    const { plan_id } = body;

    if (!plan_id || !['lite', 'pro', 'premium'].includes(plan_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan_id' },
        { status: 400 }
      );
    }

    const userUuid = session.user.uuid;

    console.log(`🧪 [TEST-PURCHASE] Starting test purchase for user ${userUuid}, plan: ${plan_id}`);

    // 步骤1: 获取用户当前状态
    const user = await getUserByUuid(userUuid);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`📊 [TEST-PURCHASE] Current user state:`, {
      plan: user.subscription_plan,
      status: user.subscription_status,
      credits: user.credits_remaining,
    });

    // 步骤2: 计算新积分
    const creditsToAdd = PLAN_CREDITS[plan_id];
    const currentCredits = user.credits_remaining || 0;
    const newCreditsBalance = currentCredits + creditsToAdd;

    console.log(`💰 [TEST-PURCHASE] Credits calculation:`, {
      current: currentCredits,
      toAdd: creditsToAdd,
      new: newCreditsBalance,
    });

    // 步骤3: 更新用户状态
    const updateData = {
      subscription_plan: plan_id,
      subscription_status: 'active',
      credits_remaining: newCreditsBalance,
      updated_at: getIsoTimestr(),
    };

    console.log(`📝 [TEST-PURCHASE] Updating user with:`, updateData);

    try {
      const updatedUser = await updateUser(userUuid, updateData);

      console.log(`✅ [TEST-PURCHASE] User updated successfully:`, {
        plan: updatedUser.subscription_plan,
        status: updatedUser.subscription_status,
        credits: updatedUser.credits_remaining,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${plan_id} plan`,
        previous_state: {
          plan: user.subscription_plan,
          credits: currentCredits,
        },
        new_state: {
          plan: updatedUser.subscription_plan,
          status: updatedUser.subscription_status,
          credits: updatedUser.credits_remaining,
        },
      });

    } catch (updateError: any) {
      console.error(`❌ [TEST-PURCHASE] Failed to update user:`, updateError);

      return NextResponse.json({
        success: false,
        error: 'Failed to update user',
        details: updateError.message,
        stack: updateError.stack,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ [TEST-PURCHASE] Critical error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test purchase endpoint',
    method: 'POST',
    body: {
      plan_id: 'lite | pro | premium'
    },
    description: 'Simulates a successful purchase and updates user subscription',
  });
}
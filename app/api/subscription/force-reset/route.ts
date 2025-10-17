/**
 * 强制重置用户订阅状态 API（仅用于修复数据不一致问题）
 * ⚠️ 此端点仅用于开发和调试，生产环境应该移除或加强安全验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';
import { supabaseAdmin, TABLES } from '@/lib/supabase';
import { getIsoTimestr } from '@/lib/time';

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

    const userUuid = session.user.uuid;

    console.log(`🔧 [FORCE-RESET] Starting force reset for user ${userUuid}`);

    // 🔍 步骤1: 获取当前用户状态
    const { data: user, error: fetchError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('subscription_plan, subscription_status, subscription_stripe_id, credits_remaining')
      .eq('uuid', userUuid)
      .single();

    if (fetchError || !user) {
      console.error(`❌ [FORCE-RESET] Failed to fetch user:`, fetchError);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`📊 [FORCE-RESET] Current state:`, {
      plan: user.subscription_plan,
      status: user.subscription_status,
      stripeId: user.subscription_stripe_id,
      credits: user.credits_remaining,
    });

    // 🔍 步骤2: 强制重置为免费计划（保留积分）
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        subscription_plan: 'free',
        subscription_status: 'cancelled', // ✅ 修复：使用 'cancelled' (双L) 以匹配数据库约束
        subscription_stripe_id: null,
        updated_at: getIsoTimestr(),
      })
      .eq('uuid', userUuid)
      .select();

    if (updateError) {
      console.error(`❌ [FORCE-RESET] Failed to update user:`, updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user', details: updateError },
        { status: 500 }
      );
    }

    if (!updateResult || updateResult.length === 0) {
      console.error(`❌ [FORCE-RESET] Update returned no rows`);
      return NextResponse.json(
        { success: false, error: 'Update failed - no rows affected' },
        { status: 500 }
      );
    }

    console.log(`✅ [FORCE-RESET] User updated successfully:`, updateResult[0]);

    // 🔍 步骤3: 记录变更
    try {
      await supabaseAdmin
        .from('subscription_changes')
        .insert({
          user_uuid: userUuid,
          from_plan: user.subscription_plan,
          to_plan: 'free',
          change_type: 'cancellation', // ✅ 修复：使用 'cancellation' 以匹配数据库约束
          credits_before: user.credits_remaining || 0,
          credits_after: user.credits_remaining || 0,
          credits_adjustment: 0,
          reason: 'Force reset via API (manual cleanup)',
          metadata: {
            reset_reason: 'manual_force_reset',
            previous_stripe_id: user.subscription_stripe_id,
            previous_status: user.subscription_status,
          },
        });
      console.log(`✅ [FORCE-RESET] Change recorded successfully`);
    } catch (changeErr) {
      console.error(`⚠️ [FORCE-RESET] Failed to record change (non-critical):`, changeErr);
    }

    console.log(`🎉 [FORCE-RESET] Force reset completed successfully`);

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been reset to free plan',
      previous_state: {
        plan: user.subscription_plan,
        status: user.subscription_status,
        stripeId: user.subscription_stripe_id,
        credits: user.credits_remaining,
      },
      new_state: updateResult[0],
    });

  } catch (error: any) {
    console.error('❌ [FORCE-RESET] Critical error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Force reset subscription endpoint',
    method: 'POST',
    description: 'Forcefully resets user subscription to free plan, preserving credits',
    warning: 'This endpoint bypasses Stripe and directly modifies the database',
  });
}
/**
 * 检查重复用户账户API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET() {
  // 安全检查：仅在开发环境运行
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    await requireAdmin();

    console.log('🔍 检查重复用户账户...');

    // 查找所有用户
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, nickname, subscription_plan, credits_remaining, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('查询用户失败:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to query users', details: usersError },
        { status: 500 }
      );
    }

    // 查找UUID格式邮箱的用户
    const uuidEmailUsers = allUsers?.filter(user =>
      user.email && user.email.includes('@vidfab.ai')
    ) || [];

    // 查找真实邮箱用户
    const realEmailUsers = allUsers?.filter(user =>
      user.email && !user.email.includes('@vidfab.ai')
    ) || [];

    console.log(`📊 总用户数: ${allUsers?.length || 0}`);
    console.log(`📊 UUID格式邮箱用户: ${uuidEmailUsers.length}`);
    console.log(`📊 真实邮箱用户: ${realEmailUsers.length}`);

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: allUsers?.length || 0,
        uuidEmailUsers: uuidEmailUsers.length,
        realEmailUsers: realEmailUsers.length
      },
      uuidEmailUsers: uuidEmailUsers.map(user => ({
        uuid: user.uuid,
        email: user.email,
        nickname: user.nickname,
        subscription_plan: user.subscription_plan,
        credits_remaining: user.credits_remaining,
        created_at: user.created_at
      })),
      realEmailUsers: realEmailUsers.map(user => ({
        uuid: user.uuid,
        email: user.email,
        nickname: user.nickname,
        subscription_plan: user.subscription_plan,
        credits_remaining: user.credits_remaining,
        created_at: user.created_at
      }))
    });

  } catch (error: any) {
    console.error('检查重复用户失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check duplicate users',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // 安全检查：仅在开发环境运行
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    await requireAdmin();

    const { action, keepUuid, deleteUuid } = await req.json();

    if (action === 'merge' && keepUuid && deleteUuid) {
      console.log(`🔄 合并用户账户: 保留 ${keepUuid}, 删除 ${deleteUuid}`);

      // 获取要保留的用户信息
      const { data: keepUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('uuid', keepUuid)
        .single();

      // 获取要删除的用户信息
      const { data: deleteUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('uuid', deleteUuid)
        .single();

      if (!keepUser || !deleteUser) {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }

      // 合并积分（取最大值）
      const mergedCredits = Math.max(
        keepUser.credits_remaining || 0,
        deleteUser.credits_remaining || 0
      );

      // 保留最高级的订阅计划
      const planPriority = { 'free': 0, 'lite': 1, 'pro': 2, 'premium': 3 };
      const keepPlanValue = keepUser.subscription_plan || 'free';
      const deletePlanValue = deleteUser.subscription_plan || 'free';
      const keepPlan = (planPriority[keepPlanValue] || 0) >= (planPriority[deletePlanValue] || 0)
        ? keepPlanValue
        : deletePlanValue;

      // 更新保留的用户
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          credits_remaining: mergedCredits,
          subscription_plan: keepPlan,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', keepUuid);

      if (updateError) {
        console.error('更新用户失败:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update user', details: updateError },
          { status: 500 }
        );
      }

      // 删除重复用户
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('uuid', deleteUuid);

      if (deleteError) {
        console.error('删除用户失败:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete user', details: deleteError },
          { status: 500 }
        );
      }

      console.log('✅ 用户账户合并成功');

      return NextResponse.json({
        success: true,
        message: '用户账户合并成功',
        mergedUser: {
          uuid: keepUuid,
          credits: mergedCredits,
          plan: keepPlan
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing parameters' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('处理重复用户失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process duplicate users',
      },
      { status: error.status || 500 }
    );
  }
}

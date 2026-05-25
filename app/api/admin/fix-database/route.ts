/**
 * 临时数据库修复API端点
 * 仅在开发环境中使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

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
    const db = supabaseAdmin as any;

    console.log('🔧 开始执行数据库修复...');

    // 🔥 步骤1: 删除现有约束
    const { error: dropConstraintError } = await db.rpc('exec_sql', {
      sql: 'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;'
    });

    // 如果rpc不可用，尝试直接修改
    if (dropConstraintError) {
      console.log('⚠️ 尝试使用替代方法修复约束...');

      // 🔥 步骤1: 直接更新用户的无效subscription_plan值
      const { error: updateError1 } = await db
        .from('users')
        .update({ subscription_plan: 'free' })
        .eq('subscription_plan', 'basic');

      if (updateError1) {
        console.error('更新basic plan失败:', updateError1);
      } else {
        console.log('✅ 已将basic plan更新为free');
      }

      const { error: updateError2 } = await db
        .from('users')
        .update({ subscription_plan: 'premium' })
        .eq('subscription_plan', 'enterprise');

      if (updateError2) {
        console.error('更新enterprise plan失败:', updateError2);
      } else {
        console.log('✅ 已将enterprise plan更新为premium');
      }

      // 🔥 步骤2: 尝试创建测试用户来验证约束
      const testUserId = crypto.randomUUID();
      const { error: testInsertError } = await db
        .from('users')
        .insert({
          uuid: testUserId,
          email: `test-${Date.now()}@example.com`,
          nickname: `test${Date.now()}`,
          signin_type: 'credentials',
          signin_provider: 'test',
          signin_openid: testUserId,
          subscription_plan: 'lite',
          subscription_status: 'active',
          credits_remaining: 300,
          email_verified: true,
          is_active: true
        });

      if (testInsertError) {
        console.error('测试插入lite套餐失败:', testInsertError);
        return NextResponse.json({
          success: false,
          error: 'Database constraint still prevents lite plan usage',
          details: testInsertError,
          message: '需要在Supabase Dashboard中手动执行SQL修复脚本'
        });
      } else {
        console.log('✅ 测试插入lite套餐成功');

        // 清理测试数据
        await db
          .from('users')
          .delete()
          .eq('uuid', testUserId);

        console.log('✅ 已清理测试数据');
      }
    }

    // 🔥 步骤3: 验证修复结果
    const { data: planStats, error: statsError } = await db
      .from('users')
      .select('subscription_plan')
      .not('subscription_plan', 'is', null);

    if (statsError) {
      console.error('获取套餐统计失败:', statsError);
    } else {
      const planCounts = planStats.reduce((acc: any, user: any) => {
        acc[user.subscription_plan] = (acc[user.subscription_plan] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 当前套餐分布:', planCounts);
    }

    return NextResponse.json({
      success: true,
      message: '数据库修复完成',
      planStats: planStats || [],
      note: '如果仍有约束错误，请在Supabase Dashboard中手动执行fix-subscription-schema.sql'
    });

  } catch (error: any) {
    console.error('数据库修复失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Database fix failed',
      details: error.message,
      solution: '请在Supabase Dashboard SQL编辑器中手动执行修复脚本'
    });
  }
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      message: 'Database fix endpoint',
      usage: 'POST to execute database constraint fixes',
      environment: process.env.NODE_ENV,
      available: process.env.NODE_ENV === 'development'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Unauthorized' },
      { status: error.status || 500 }
    );
  }
}

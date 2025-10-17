/**
 * 紧急数据库修复API
 * 修复subscription_plan约束违规问题
 * 仅在开发环境中使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // 🔥 只在开发环境中允许此操作
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Only available in development environment' },
        { status: 403 }
      );
    }

    console.log('🔥 开始紧急数据库修复...');
    console.log('⚠️ 注意：此操作会修改数据库约束，请确保了解影响');

    const steps = [];

    // 第1步：创建修复函数
    console.log('📋 第1步：创建修复函数...');
    const createFixFunction = `
      CREATE OR REPLACE FUNCTION emergency_fix_subscription_constraints()
      RETURNS text AS $$
      BEGIN
        -- 删除现有约束
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

        -- 添加新约束
        ALTER TABLE users ADD CONSTRAINT users_subscription_plan_check
          CHECK (subscription_plan IN ('free', 'lite', 'pro', 'premium', 'basic', 'enterprise'));

        -- 更新默认值
        ALTER TABLE users ALTER COLUMN subscription_plan SET DEFAULT 'free';

        -- 更新subscription_status约束
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
        ALTER TABLE users ADD CONSTRAINT users_subscription_status_check
          CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'paused'));

        RETURN 'Constraints updated successfully';
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: createFunctionError } = await supabaseAdmin.rpc('query', {
      query: createFixFunction
    });

    if (createFunctionError) {
      // 如果RPC不可用，我们跳过约束修改，只修复数据
      console.log('⚠️ 无法修改约束，继续修复数据...');
      steps.push('Skipped constraint modification (requires manual Supabase SQL execution)');
    } else {
      // 执行修复函数
      const { error: executeFunctionError } = await supabaseAdmin.rpc('emergency_fix_subscription_constraints');

      if (executeFunctionError) {
        console.log('⚠️ 约束修改失败:', executeFunctionError);
        steps.push('Constraint modification failed - manual execution needed');
      } else {
        steps.push('Constraints updated successfully');
      }
    }

    // 第2步：迁移现有数据（这个总是可以执行）
    console.log('📋 第2步：迁移现有数据...');

    // 将 basic -> free
    const { error: updateBasicError } = await supabaseAdmin
      .from('users')
      .update({ subscription_plan: 'free' })
      .eq('subscription_plan', 'basic');

    if (updateBasicError && !updateBasicError.message.includes('No rows')) {
      console.log('⚠️ 更新basic用户错误:', updateBasicError);
      steps.push('Failed to migrate basic users');
    } else {
      steps.push('Migrated basic users to free');
    }

    // 将 enterprise -> premium
    const { error: updateEnterpriseError } = await supabaseAdmin
      .from('users')
      .update({ subscription_plan: 'premium' })
      .eq('subscription_plan', 'enterprise');

    if (updateEnterpriseError && !updateEnterpriseError.message.includes('No rows')) {
      console.log('⚠️ 更新enterprise用户错误:', updateEnterpriseError);
      steps.push('Failed to migrate enterprise users');
    } else {
      steps.push('Migrated enterprise users to premium');
    }

    // 第3步：确保免费用户有正确的积分
    console.log('📋 第3步：更新免费用户积分...');
    const { error: updateCreditsError } = await supabaseAdmin
      .from('users')
      .update({ credits_remaining: 50 })
      .eq('subscription_plan', 'free')
      .lte('credits_remaining', 10);

    if (updateCreditsError) {
      console.log('⚠️ 更新积分错误:', updateCreditsError);
      steps.push('Failed to update free user credits');
    } else {
      steps.push('Updated free user credits to 50');
    }

    // 第4步：验证修复结果
    console.log('📋 第4步：验证修复结果...');
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status, credits_remaining')
      .limit(5);

    if (verifyError) {
      console.error('验证错误:', verifyError);
      steps.push('Verification failed');
    } else {
      steps.push('Verification completed');
    }

    console.log('✅ 数据库修复流程完成！');
    console.log('📊 验证数据样本:', verification);

    return NextResponse.json({
      success: true,
      message: 'Database emergency fix completed',
      verification_sample: verification,
      steps_completed: steps,
      manual_action_required: !createFunctionError ? null :
        'Please manually execute the SQL in /lib/database/fix-subscription-schema.sql in Supabase SQL editor'
    });

  } catch (error: any) {
    console.error('紧急数据库修复失败:', error);
    return NextResponse.json(
      { success: false, error: 'Database fix failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Only available in development environment' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Emergency database fix endpoint',
    method: 'POST',
    description: 'Fixes subscription_plan constraint violations',
    note: 'Only works in development environment'
  });
}
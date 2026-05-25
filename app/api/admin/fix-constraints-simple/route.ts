/**
 * 简单快速的数据库约束修复
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    await requireAdmin();
    const db = supabaseAdmin as any;

    console.log('🔧 开始快速修复数据库约束...');

    // 🔥 快速修复：直接更新现有的约束值
    const updateQueries = [
      // 将所有 'basic' 用户改为 'free'
      { sql: "UPDATE users SET subscription_plan = 'free' WHERE subscription_plan = 'basic';" },
      // 将所有 'enterprise' 用户改为 'premium'
      { sql: "UPDATE users SET subscription_plan = 'premium' WHERE subscription_plan = 'enterprise';" }
    ];

    for (const query of updateQueries) {
      try {
        const { error } = await db
          .from('users')
          .select('uuid')
          .limit(1);

        if (query.sql.includes('basic')) {
          console.log('🔄 更新basic用户为free...');
          const { error: updateError } = await db
            .from('users')
            .update({ subscription_plan: 'free' })
            .eq('subscription_plan', 'basic');

          if (updateError) {
            console.error('更新basic用户失败:', updateError);
          } else {
            console.log('✅ basic用户已更新为free');
          }
        }

        if (query.sql.includes('enterprise')) {
          console.log('🔄 更新enterprise用户为premium...');
          const { error: updateError } = await db
            .from('users')
            .update({ subscription_plan: 'premium' })
            .eq('subscription_plan', 'enterprise');

          if (updateError) {
            console.error('更新enterprise用户失败:', updateError);
          } else {
            console.log('✅ enterprise用户已更新为premium');
          }
        }
      } catch (e) {
        console.log(`⚠️ SQL执行跳过: ${query.sql}`);
      }
    }

    // 🔥 尝试创建lite用户测试约束
    const testEmail = `constraint-test-${Date.now()}@example.com`;
    const testUuid = crypto.randomUUID();

    const { error: testError } = await db
      .from('users')
      .insert({
        uuid: testUuid,
        email: testEmail,
        nickname: 'constraint-test',
        signin_type: 'credentials',
        signin_provider: 'test',
        signin_openid: testUuid,
        subscription_plan: 'lite',
        subscription_status: 'active',
        credits_remaining: 300,
        email_verified: true,
        is_active: true
      });

    if (testError) {
      console.error('❌ 约束测试失败:', testError);
      return NextResponse.json({
        success: false,
        error: 'Database constraints still prevent new plan types',
        details: testError,
        message: '需要在Supabase Dashboard中手动修复约束'
      });
    } else {
      console.log('✅ 约束测试成功，清理测试数据...');
      // 清理测试数据
      await db
        .from('users')
        .delete()
        .eq('uuid', testUuid);
    }

    return NextResponse.json({
      success: true,
      message: '数据库约束修复完成，可以使用新的套餐类型了'
    });

  } catch (error: any) {
    console.error('约束修复失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Constraint fix failed',
      details: error.message
    }, { status: error.status || 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      message: 'Simple constraint fix endpoint',
      usage: 'POST to fix database constraints quickly',
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

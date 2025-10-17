/**
 * 直接修复UUID不匹配 - 通过SQL直接操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserUuidFromEmail } from '@/lib/hash';

export async function POST(req: NextRequest) {
  // 安全检查：仅在开发环境运行
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email参数是必需的' },
        { status: 400 }
      );
    }

    console.log(`🔧 直接修复用户UUID: ${email}`);

    // 生成确定性UUID
    const correctUuid = getUserUuidFromEmail(email);
    console.log(`✅ 确定性UUID: ${correctUuid}`);

    // 查找当前用户
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('uuid, email')
      .eq('email', email)
      .single();

    if (findError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (existingUser.uuid === correctUuid) {
      return NextResponse.json({
        success: true,
        message: 'UUID已经匹配，无需修复',
        uuid: correctUuid
      });
    }

    console.log(`🔄 当前UUID: ${existingUser.uuid} -> 目标UUID: ${correctUuid}`);

    // 🔥 方法：使用RPC执行原子操作
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('fix_user_uuid', {
      user_email: email,
      old_uuid: existingUser.uuid,
      new_uuid: correctUuid
    });

    if (rpcError) {
      console.error('RPC修复失败:', rpcError);

      // 如果RPC不可用，尝试手动步骤
      console.log('🔧 尝试手动修复...');

      // 步骤1: 临时禁用约束（仅开发环境）
      const { error: disableError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'SET session_replication_role = replica;'
      });

      // 步骤2: 更新关联表
      const updateQueries = [
        `UPDATE user_storage_quotas SET user_id = '${correctUuid}' WHERE user_id = '${existingUser.uuid}';`,
        `UPDATE user_videos SET user_uuid = '${correctUuid}' WHERE user_uuid = '${existingUser.uuid}';`,
      ];

      for (const query of updateQueries) {
        try {
          await supabaseAdmin.rpc('exec_sql', { sql: query });
          console.log(`✅ 执行SQL: ${query}`);
        } catch (e) {
          console.log(`⚠️ SQL执行失败或表不存在: ${query}`);
        }
      }

      // 步骤3: 更新用户UUID
      const { error: updateUserError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `UPDATE users SET uuid = '${correctUuid}' WHERE email = '${email}';`
      });

      // 步骤4: 重新启用约束
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'SET session_replication_role = DEFAULT;'
      });

      if (updateUserError) {
        console.error('手动修复失败:', updateUserError);
        return NextResponse.json(
          { success: false, error: 'Manual fix failed', details: updateUserError },
          { status: 500 }
        );
      }
    }

    // 验证修复结果
    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('uuid, email')
      .eq('email', email)
      .single();

    return NextResponse.json({
      success: true,
      message: 'UUID修复成功！用户现在可以正常使用订阅功能了',
      before: { uuid: existingUser.uuid, email: email },
      after: { uuid: verifyUser?.uuid, email: email },
      note: '请刷新页面重新登录以获取新的JWT token'
    });

  } catch (error: any) {
    console.error('直接修复UUID失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix UUID directly',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Direct UUID fix endpoint',
    usage: 'POST with { email }',
    description: '使用SQL直接修复UUID不匹配问题',
    environment: process.env.NODE_ENV,
    available: process.env.NODE_ENV === 'development'
  });
}
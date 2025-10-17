/**
 * 紧急修复用户UUID不匹配问题API
 * 将数据库中的用户UUID更新为确定性UUID，以匹配JWT token
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

    console.log(`🔧 修复用户UUID不匹配: ${email}`);

    // 生成确定性UUID
    const correctUuid = getUserUuidFromEmail(email);
    console.log(`✅ 确定性UUID: ${correctUuid}`);

    // 查找当前数据库中的用户记录
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, nickname, subscription_plan, credits_remaining, created_at')
      .eq('email', email)
      .single();

    if (findError) {
      console.error('查找用户失败:', findError);
      return NextResponse.json(
        { success: false, error: 'User not found', details: findError },
        { status: 404 }
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    console.log('📊 原始用户信息:', {
      oldUuid: existingUser.uuid,
      email: existingUser.email,
      nickname: existingUser.nickname,
      plan: existingUser.subscription_plan,
      credits: existingUser.credits_remaining
    });

    // 检查是否已经是正确的UUID
    if (existingUser.uuid === correctUuid) {
      console.log('✅ UUID已经匹配，无需修复');
      return NextResponse.json({
        success: true,
        message: 'UUID已经匹配，无需修复',
        uuid: correctUuid,
        email: email
      });
    }

    // 检查确定性UUID是否已被其他用户使用
    const { data: conflictUser, error: conflictError } = await supabaseAdmin
      .from('users')
      .select('uuid, email')
      .eq('uuid', correctUuid)
      .single();

    if (conflictUser) {
      console.error('⚠️ UUID冲突，该确定性UUID已被其他用户使用:', conflictUser);
      return NextResponse.json(
        {
          success: false,
          error: 'UUID conflict',
          details: `确定性UUID ${correctUuid} 已被用户 ${conflictUser.email} 使用`,
          conflictUser: conflictUser
        },
        { status: 409 }
      );
    }

    // 🔥 步骤1: 查找所有引用此UUID的关联表
    const relatedTables = ['user_storage_quotas', 'user_videos', 'user_subscriptions'];
    const relatedData: any = {};

    for (const table of relatedTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .eq('user_id', existingUser.uuid);

        if (!error && data) {
          relatedData[table] = data;
          console.log(`📊 表 ${table} 中找到 ${data.length} 条关联记录`);
        }
      } catch (e) {
        console.log(`⚠️ 表 ${table} 不存在或无法访问`);
      }
    }

    // 🔥 步骤2: 创建新的用户记录使用确定性UUID
    const { error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        uuid: correctUuid,
        email: existingUser.email,
        nickname: existingUser.nickname,
        avatar_url: existingUser.avatar_url || '',
        signin_type: existingUser.signin_type || 'credentials',
        signin_provider: existingUser.signin_provider || 'verification-code',
        signin_openid: existingUser.signin_openid || correctUuid,
        subscription_plan: existingUser.subscription_plan || 'free',
        subscription_status: existingUser.subscription_status || 'active',
        credits_remaining: existingUser.credits_remaining || 0,
        email_verified: existingUser.email_verified || true,
        is_active: existingUser.is_active !== false,
        signin_ip: existingUser.signin_ip || null,
        last_login_at: existingUser.last_login_at,
        created_at: existingUser.created_at,
        updated_at: new Date().toISOString()
      });

    if (createError) {
      console.error('创建新用户记录失败:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create new user record', details: createError },
        { status: 500 }
      );
    }

    console.log('✅ 新用户记录创建成功');

    // 🔥 步骤3: 更新所有关联表的user_id
    for (const [table, records] of Object.entries(relatedData)) {
      if (!records || !Array.isArray(records) || records.length === 0) continue;

      try {
        const { error: updateRelatedError } = await supabaseAdmin
          .from(table)
          .update({ user_id: correctUuid })
          .eq('user_id', existingUser.uuid);

        if (updateRelatedError) {
          console.error(`更新表 ${table} 失败:`, updateRelatedError);
        } else {
          console.log(`✅ 表 ${table} 更新成功，${records.length} 条记录`);
        }
      } catch (e) {
        console.error(`处理表 ${table} 时出错:`, e);
      }
    }

    // 🔥 步骤4: 删除旧的用户记录
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('uuid', existingUser.uuid);

    if (deleteError) {
      console.error('删除旧用户记录失败:', deleteError);
      // 不返回错误，因为新记录已经创建成功
      console.log('⚠️ 旧记录删除失败，但新记录已创建，用户可以正常使用');
    } else {
      console.log('✅ 旧用户记录删除成功');
    }

    console.log('✅ 用户UUID修复成功');

    // 验证更新结果
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('uuid, email, nickname, subscription_plan, credits_remaining')
      .eq('email', email)
      .single();

    return NextResponse.json({
      success: true,
      message: '用户UUID不匹配问题已修复',
      before: {
        uuid: existingUser.uuid,
        email: existingUser.email
      },
      after: {
        uuid: updatedUser?.uuid,
        email: updatedUser?.email,
        nickname: updatedUser?.nickname,
        plan: updatedUser?.subscription_plan,
        credits: updatedUser?.credits_remaining
      },
      note: '用户现在可以正常使用订阅功能了'
    });

  } catch (error: any) {
    console.error('修复UUID不匹配失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix UUID mismatch',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Fix UUID mismatch endpoint',
    usage: 'POST with { email }',
    description: '修复JWT token中的确定性UUID与数据库UUID不匹配的问题',
    environment: process.env.NODE_ENV,
    available: process.env.NODE_ENV === 'development'
  });
}
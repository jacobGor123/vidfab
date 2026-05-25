/**
 * 修复用户邮箱地址API
 * 将UUID格式的邮箱修复为真实邮箱
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

    const { uuid, correctEmail } = await req.json();

    if (!uuid || !correctEmail) {
      return NextResponse.json(
        { success: false, error: 'uuid和correctEmail参数是必需的' },
        { status: 400 }
      );
    }

    console.log(`🔧 修复用户邮箱: ${uuid} -> ${correctEmail}`);

    // 更新用户邮箱
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email: correctEmail,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', uuid);

    if (updateError) {
      console.error('更新用户邮箱失败:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user email', details: updateError },
        { status: 500 }
      );
    }

    console.log('✅ 用户邮箱更新成功');

    return NextResponse.json({
      success: true,
      message: '用户邮箱已成功修复',
      uuid,
      newEmail: correctEmail
    });

  } catch (error: any) {
    console.error('修复用户邮箱失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix user email',
      details: error.message
    }, { status: error.status || 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      message: 'Fix user email endpoint',
      usage: 'POST with { uuid, correctEmail }',
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

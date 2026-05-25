/**
 * 直接更新用户积分API - 用于测试
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

    const { email, credits, plan } = await req.json();

    if (!email || !credits || !plan) {
      return NextResponse.json(
        { success: false, error: 'email, credits, and plan are required' },
        { status: 400 }
      );
    }

    console.log(`🔧 直接更新用户积分: ${email} -> ${credits} credits, ${plan} plan`);

    // 查找用户
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('uuid, credits_remaining, subscription_plan')
      .eq('email', email)
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`📊 当前状态: ${user.credits_remaining} credits, ${user.subscription_plan} plan`);

    // 更新积分和套餐
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        credits_remaining: credits,
        subscription_plan: plan,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('uuid', user.uuid);

    if (updateError) {
      console.error('更新失败:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user', details: updateError },
        { status: 500 }
      );
    }

    console.log(`✅ 更新成功: ${credits} credits, ${plan} plan`);

    return NextResponse.json({
      success: true,
      message: '积分和套餐更新成功',
      before: {
        credits: user.credits_remaining,
        plan: user.subscription_plan
      },
      after: {
        credits: credits,
        plan: plan
      }
    });

  } catch (error: any) {
    console.error('直接更新积分失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update credits',
      details: error.message
    }, { status: error.status || 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      message: 'Direct credits update endpoint',
      usage: 'POST with { email, credits, plan }',
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

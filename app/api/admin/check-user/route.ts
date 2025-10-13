/**
 * 管理员工具：用户状态查询 API
 * GET /api/admin/check-user?email=xxx@xxx.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: '请提供用户邮箱地址' },
        { status: 400 }
      );
    }

    // 1. 查询用户基本信息
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: `用户不存在: ${email}`, details: userError },
        { status: 404 }
      );
    }

    const userData: any = user;

    // 2. 查询积分交易历史（最近10条）
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('credits_transactions')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. 查询订阅变更历史
    const { data: changes, error: changesError } = await supabaseAdmin
      .from('subscription_changes')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. 查询订阅订单历史
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('subscription_orders')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. 查询当前订阅信息
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 返回所有信息
    return NextResponse.json({
      success: true,
      data: {
        user: {
          email: userData.email,
          nickname: userData.nickname,
          uuid: userData.uuid,
          created_at: userData.created_at,
          last_login: userData.last_login,
          is_active: userData.is_active,
          email_verified: userData.email_verified,
          subscription_plan: userData.subscription_plan,
          subscription_status: userData.subscription_status,
          credits_remaining: userData.credits_remaining,
          total_videos_processed: userData.total_videos_processed,
          storage_used_mb: userData.storage_used_mb,
          max_storage_mb: userData.max_storage_mb,
          credits_last_reset_date: userData.credits_last_reset_date,
          total_credits_earned: userData.total_credits_earned,
          total_credits_spent: userData.total_credits_spent,
        },
        transactions: transError ? null : transactions,
        subscription_changes: changesError ? null : changes,
        subscription_orders: ordersError ? null : orders,
        current_subscription: subError ? null : subscription,
      },
      errors: {
        transactions: transError?.message,
        subscription_changes: changesError?.message,
        subscription_orders: ordersError?.message,
        current_subscription: subError?.message,
      },
    });

  } catch (error: any) {
    console.error('查询用户状态失败:', error);
    return NextResponse.json(
      { error: '查询失败', details: error.message },
      { status: 500 }
    );
  }
}

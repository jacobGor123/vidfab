/**
 * 测试版Stripe Checkout会话API
 * 用于开发环境测试，跳过真实Stripe集成
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/config';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getPlanConfig } from '@/lib/subscription/pricing-config';

const createCheckoutSchema = z.object({
  plan_id: z.enum(['lite', 'pro', 'premium']),
  billing_cycle: z.enum(['monthly', 'annual']),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  console.log('🚀 [TEST-CHECKOUT] POST请求开始 - ', new Date().toISOString());
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    console.log('🔧 [TEST-CHECKOUT] Session状态:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUuid: !!session?.user?.uuid,
      userEmail: session?.user?.email
    });

    if (!session?.user?.uuid) {
      console.error('❌ [TEST-CHECKOUT] 认证失败: 无有效session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: 'No valid session found' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const validatedData = createCheckoutSchema.parse(body);

    // 开发环境下，模拟成功的checkout会话
    if (process.env.NODE_ENV === 'development') {
      try {
        // 生成模拟的session ID
        const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 🔥 重要：模拟完整的支付成功流程，更新数据库
        const planConfig = getPlanConfig(validatedData.plan_id);
        const creditsToGrant = validatedData.billing_cycle === 'annual'
          ? planConfig.credits * 12
          : planConfig.credits;

        // 获取用户当前信息
        const { data: currentUser } = await supabaseAdmin
          .from('users')
          .select('credits_remaining')
          .eq('uuid', session.user.uuid)
          .single();

        const currentCredits = currentUser?.credits_remaining || 0;

        // 🔥 修复：直接使用请求的套餐，不再使用临时的free套餐
        console.log(`🔧 [DEBUG] 测试模式: 套餐=${validatedData.plan_id}, 积分=${creditsToGrant}`);

        // 更新用户订阅状态和积分
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_plan: validatedData.plan_id, // 🔥 使用实际请求的套餐
            subscription_status: 'active',
            credits_remaining: currentCredits + creditsToGrant,
            updated_at: new Date().toISOString(),
          })
          .eq('uuid', session.user.uuid);

        if (updateError) {
          console.error('Test payment database update failed:', updateError);
          throw new Error('Failed to update user subscription');
        }

        console.log(`🎉 测试支付成功！用户 ${session.user.uuid} 已升级到 ${validatedData.plan_id} 计划，获得 ${creditsToGrant} 积分`);

        // 🔥 修复：跳转到create页面的my-profile工具
        const successUrl = validatedData.success_url ||
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/create?tool=my-profile&payment_success=true&session_id=${mockSessionId}&plan=${validatedData.plan_id}`;

        return NextResponse.json({
          success: true,
          checkout_url: successUrl,
          session_id: mockSessionId,
          plan_updated: validatedData.plan_id,
          credits_granted: creditsToGrant,
          note: 'Test payment successful - database updated'
        });
      } catch (error) {
        console.error('Test payment processing failed:', error);
        return NextResponse.json(
          { success: false, error: 'Test payment processing failed' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Real Stripe integration not configured yet' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error creating test checkout session:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test checkout endpoint for development',
    method: 'POST',
    description: 'Creates a mock checkout session for testing purposes',
    note: 'Only works in development environment'
  });
}
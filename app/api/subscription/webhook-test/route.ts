/**
 * Webhook 测试端点 - 不需要签名验证
 * 用于测试 webhook 处理逻辑是否正常
 */

import { NextResponse } from 'next/server';
import { handleCheckoutSession } from '@/lib/subscription/checkout-handler';

export async function POST(req: Request) {
  try {
    console.log('🧪 [WEBHOOK-TEST] Received test request');

    const body = await req.json();
    console.log('🧪 [WEBHOOK-TEST] Request body:', JSON.stringify(body, null, 2));

    // 模拟一个 checkout.session.completed 事件
    const mockSession = {
      id: body.session_id || 'cs_test_manual',
      payment_status: 'paid',
      subscription: body.subscription_id || 'sub_test_manual',
      metadata: body.metadata || {},
    };

    console.log('🧪 [WEBHOOK-TEST] Processing mock session:', mockSession);

    await handleCheckoutSession(mockSession as any);

    console.log('✅ [WEBHOOK-TEST] Success!');

    return NextResponse.json({
      success: true,
      message: 'Webhook test completed successfully',
    });

  } catch (error: any) {
    console.error('❌ [WEBHOOK-TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint',
    description: 'POST a mock checkout session to test webhook processing',
    example: {
      session_id: 'cs_test_xxx',
      subscription_id: 'sub_xxx',
      metadata: {
        user_uuid: 'your-user-uuid',
        plan_id: 'pro',
        billing_cycle: 'monthly'
      }
    }
  });
}
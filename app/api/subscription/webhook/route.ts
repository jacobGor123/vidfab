/**
 * Stripe Webhook处理端点 - 简化版（参考iMedio）
 * 只处理checkout.session.completed事件，删除复杂的订阅逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/subscription/stripe-config';
import { handleCheckoutSession } from '@/lib/subscription/checkout-handler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 验证webhook签名
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`🔔 Processing webhook event: ${event.type}`);

    // 🔥 简化版：只处理checkout.session.completed事件（参考iMedio）
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${event.type} (简化版只处理checkout完成事件)`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active (simplified version)' });
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
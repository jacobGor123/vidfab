/**
 * 数据库初始化API
 * 仅用于开发环境，帮助创建订阅系统所需的数据库表
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 仅在开发环境可用
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 环境检查
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const results = [];

    // 1. 检查并创建 subscription_orders 表
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS subscription_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
            order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('subscription', 'upgrade', 'downgrade', 'renewal')),
            plan_id VARCHAR(20) NOT NULL CHECK (plan_id IN ('free', 'lite', 'pro', 'premium')),
            billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
            amount_cents INTEGER NOT NULL DEFAULT 0,
            currency VARCHAR(3) DEFAULT 'USD',
            credits_included INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
            stripe_payment_intent_id VARCHAR(255),
            stripe_subscription_id VARCHAR(255),
            stripe_customer_id VARCHAR(255),
            stripe_checkout_session_id VARCHAR(255),
            period_start TIMESTAMPTZ,
            period_end TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ,
            metadata JSONB DEFAULT '{}',
            notes TEXT,
            CONSTRAINT positive_amount CHECK (amount_cents >= 0),
            CONSTRAINT positive_credits CHECK (credits_included >= 0)
          );
        `
      });
      results.push('subscription_orders table created/verified');
    } catch (error: any) {
      // 如果RPC不存在，直接使用SQL执行
      try {
        const { error } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'subscription_orders')
          .single();

        if (error) {
          // 表不存在，创建表
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS subscription_orders (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_uuid UUID NOT NULL,
              order_type VARCHAR(20) NOT NULL,
              plan_id VARCHAR(20) NOT NULL,
              billing_cycle VARCHAR(10) NOT NULL,
              amount_cents INTEGER NOT NULL DEFAULT 0,
              currency VARCHAR(3) DEFAULT 'USD',
              credits_included INTEGER NOT NULL DEFAULT 0,
              status VARCHAR(20) DEFAULT 'pending',
              stripe_customer_id VARCHAR(255),
              stripe_checkout_session_id VARCHAR(255),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              metadata JSONB DEFAULT '{}'
            );
          `;

          // 通过创建一个临时的API来执行这个
          results.push('subscription_orders table needs manual creation');
        } else {
          results.push('subscription_orders table already exists');
        }
      } catch (e: any) {
        results.push(`Error checking subscription_orders: ${e.message}`);
      }
    }

    // 2. 创建 credits_transactions 表
    try {
      const { error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'credits_transactions')
        .single();

      if (error) {
        results.push('credits_transactions table needs to be created manually');
      } else {
        results.push('credits_transactions table already exists');
      }
    } catch (error: any) {
      results.push(`Error checking credits_transactions: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup attempted',
      results,
      instruction: 'If tables need manual creation, please run the SQL from lib/database/subscription-schema.sql in your Supabase SQL editor.'
    });

  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        instruction: 'Please manually run the SQL from lib/database/subscription-schema.sql in your Supabase SQL editor.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database setup endpoint',
    method: 'POST',
    description: 'Initialize subscription system database tables',
    note: 'Only available in development environment'
  });
}
#!/usr/bin/env ts-node
/**
 * 用户状态检查工具
 * 用于查询用户的积分、订阅状态和历史记录
 */

import { supabaseAdmin } from '../lib/supabase';

const USER_EMAIL = process.argv[2];

if (!USER_EMAIL) {
  console.error('❌ 请提供用户邮箱地址');
  console.log('用法: pnpm dlx ts-node scripts/check-user-status.ts <email>');
  process.exit(1);
}

async function checkUserStatus(email: string) {
  console.log('\n🔍 正在查询用户状态...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 查询用户基本信息
    console.log('📋 用户基本信息:');
    console.log('─────────────────────────────────────────\n');

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('❌ 用户不存在:', email);
      process.exit(1);
    }

    // 使用 any 类型避免类型检查问题
    const userData: any = user;

    console.log(`邮箱: ${userData.email}`);
    console.log(`昵称: ${userData.nickname}`);
    console.log(`UUID: ${userData.uuid}`);
    console.log(`注册时间: ${userData.created_at}`);
    console.log(`最后登录: ${userData.last_login || '未登录'}`);
    console.log(`账号状态: ${userData.is_active ? '✅ 激活' : '❌ 未激活'}`);
    console.log(`邮箱验证: ${userData.email_verified ? '✅ 已验证' : '❌ 未验证'}`);
    console.log('');
    console.log(`当前订阅计划: ${userData.subscription_plan || 'N/A'}`);
    console.log(`订阅状态: ${userData.subscription_status || 'N/A'}`);
    console.log(`剩余积分: ${userData.credits_remaining || 0}`);
    console.log(`总处理视频数: ${userData.total_videos_processed || 0}`);
    console.log(`已用存储空间: ${userData.storage_used_mb || 0} MB`);
    console.log(`最大存储空间: ${userData.max_storage_mb || 0} MB`);

    if (userData.credits_last_reset_date) {
      console.log(`积分最后重置: ${userData.credits_last_reset_date}`);
    }
    if (userData.total_credits_earned) {
      console.log(`总获得积分: ${userData.total_credits_earned}`);
    }
    if (userData.total_credits_spent) {
      console.log(`总消费积分: ${userData.total_credits_spent}`);
    }

    // 2. 查询积分交易历史（最近10条）
    console.log('\n\n💰 积分交易历史 (最近10条):');
    console.log('─────────────────────────────────────────\n');

    const { data: transactions, error: transError } = await supabaseAdmin
      .from('credits_transactions')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transError) {
      console.log('⚠️  无法查询积分交易记录:', transError.message);
    } else if (!transactions || transactions.length === 0) {
      console.log('📭 暂无积分交易记录');
    } else {
      (transactions as any[]).forEach((trans, index) => {
        console.log(`[${index + 1}] ${trans.created_at}`);
        console.log(`    类型: ${trans.transaction_type}`);
        console.log(`    数量: ${trans.credits_amount > 0 ? '+' : ''}${trans.credits_amount}`);
        console.log(`    余额变化: ${trans.balance_before} → ${trans.balance_after}`);
        if (trans.description) {
          console.log(`    说明: ${trans.description}`);
        }
        if (trans.consumed_by) {
          console.log(`    消费项: ${trans.consumed_by}`);
        }
        console.log('');
      });
    }

    // 3. 查询订阅变更历史
    console.log('\n📊 订阅变更历史:');
    console.log('─────────────────────────────────────────\n');

    const { data: changes, error: changesError } = await supabaseAdmin
      .from('subscription_changes')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    if (changesError) {
      console.log('⚠️  无法查询订阅变更记录:', changesError.message);
    } else if (!changes || changes.length === 0) {
      console.log('📭 暂无订阅变更记录');
    } else {
      (changes as any[]).forEach((change, index) => {
        console.log(`[${index + 1}] ${change.created_at}`);
        console.log(`    变更类型: ${change.change_type}`);
        console.log(`    计划变化: ${change.from_plan || '无'} → ${change.to_plan}`);
        console.log(`    积分调整: ${change.credits_adjustment || 0} (${change.credits_before} → ${change.credits_after})`);
        if (change.reason) {
          console.log(`    原因: ${change.reason}`);
        }
        console.log('');
      });
    }

    // 4. 查询订阅订单历史
    console.log('\n🛒 订阅订单历史:');
    console.log('─────────────────────────────────────────\n');

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('subscription_orders')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.log('⚠️  无法查询订阅订单:', ordersError.message);
    } else if (!orders || orders.length === 0) {
      console.log('📭 暂无订阅订单记录');
    } else {
      (orders as any[]).forEach((order, index) => {
        console.log(`[${index + 1}] ${order.created_at}`);
        console.log(`    订单类型: ${order.order_type}`);
        console.log(`    订阅计划: ${order.plan_id}`);
        console.log(`    计费周期: ${order.billing_cycle}`);
        console.log(`    金额: ${order.amount_cents / 100} ${order.currency}`);
        console.log(`    积分数量: ${order.credits_included}`);
        console.log(`    订单状态: ${order.status}`);
        if (order.stripe_payment_intent_id) {
          console.log(`    Stripe支付ID: ${order.stripe_payment_intent_id}`);
        }
        console.log('');
      });
    }

    // 5. 查询当前订阅信息
    console.log('\n💳 当前订阅详情:');
    console.log('─────────────────────────────────────────\n');

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_uuid', userData.uuid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.log('📭 暂无订阅记录');
    } else {
      const subData: any = subscription;
      console.log(`Stripe订阅ID: ${subData.stripe_subscription_id || 'N/A'}`);
      console.log(`Stripe客户ID: ${subData.stripe_customer_id || 'N/A'}`);
      console.log(`订阅状态: ${subData.status}`);
      console.log(`计划ID: ${subData.plan_id}`);
      console.log(`当前周期开始: ${subData.current_period_start || 'N/A'}`);
      console.log(`当前周期结束: ${subData.current_period_end || 'N/A'}`);
      console.log(`创建时间: ${subData.created_at}`);
      if (subData.cancelled_at) {
        console.log(`取消时间: ${subData.cancelled_at}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 查询完成\n');

  } catch (error: any) {
    console.error('\n❌ 查询失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 执行查询
checkUserStatus(USER_EMAIL);

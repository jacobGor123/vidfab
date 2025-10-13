#!/usr/bin/env node
/**
 * 修复用户订阅状态脚本
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Missing required credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-09-30.acacia',
});

const USER_UUID = '7504efb3-b01b-59b9-952d-e8afdb1f2969';
const USER_EMAIL = '453551511@qq.com';

async function fixUserSubscription() {
  console.log('\n🔧 开始修复用户订阅状态...\n');

  try {
    // 1. 获取用户当前状态
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', USER_UUID)
      .single();

    if (userError || !user) {
      console.error('❌ 用户不存在');
      process.exit(1);
    }

    console.log('📋 用户当前状态:');
    console.log('─────────────────────────────────────────');
    console.log(`邮箱: ${user.email}`);
    console.log(`订阅计划: ${user.subscription_plan}`);
    console.log(`订阅状态: ${user.subscription_status}`);
    console.log(`剩余积分: ${user.credits_remaining}`);
    console.log(`Stripe订阅ID: ${user.subscription_stripe_id || 'N/A'}`);
    console.log('');

    // 2. 检查 Stripe 订阅真实状态
    if (user.subscription_stripe_id) {
      console.log('🔍 检查 Stripe 订阅状态...\n');

      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscription_stripe_id);

        console.log('Stripe 订阅详情:');
        console.log(`  状态: ${subscription.status}`);
        console.log(`  计划ID: ${subscription.metadata?.plan_id || 'N/A'}`);
        console.log(`  当前周期开始: ${new Date(subscription.current_period_start * 1000).toISOString()}`);
        console.log(`  当前周期结束: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        console.log(`  取消设置: ${subscription.cancel_at_period_end ? '是（期末取消）' : '否'}`);
        console.log(`  已取消: ${subscription.canceled_at ? '是' : '否'}`);
        console.log('');

        // 判断订阅是否应该活跃
        const isActive = subscription.status === 'active' && !subscription.cancel_at_period_end;
        const planId = subscription.metadata?.plan_id || 'lite';

        console.log('📊 状态分析:');
        console.log(`  Stripe中订阅: ${subscription.status}`);
        console.log(`  数据库中计划: ${user.subscription_plan}`);
        console.log(`  应该是: ${isActive ? planId : 'free'}`);
        console.log('');

        // 3. 决定修复方案
        if (isActive && user.subscription_plan === 'free') {
          console.log('✅ 方案: Stripe 订阅活跃，但用户被错误降级为 free，需要恢复订阅');
          console.log('\n是否执行修复? (需要手动确认)');
          console.log(`  - 将订阅计划从 'free' 改为 '${planId}'`);
          console.log(`  - 保持积分不变 (${user.credits_remaining})`);
          console.log('');
        } else if (!isActive && user.subscription_plan !== 'free') {
          console.log('⚠️  方案: Stripe 订阅已取消，但用户计划未更新，需要降级');
          console.log('\n是否执行修复? (需要手动确认)');
          console.log(`  - 将订阅计划改为 'free'`);
          console.log(`  - 清除 Stripe 订阅ID`);
          console.log(`  - 保持积分不变 (${user.credits_remaining})`);
          console.log('');
        } else if (!isActive && user.subscription_plan === 'free' && user.subscription_stripe_id) {
          console.log('🧹 方案: 订阅已取消且计划正确，但 Stripe ID 未清理');
          console.log('\n建议操作:');
          console.log(`  - 清除 Stripe 订阅ID`);
          console.log('');

          // 执行清理
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_stripe_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('uuid', USER_UUID);

          if (updateError) {
            console.error('❌ 更新失败:', updateError);
          } else {
            console.log('✅ Stripe 订阅ID 已清理');
          }
        } else {
          console.log('✅ 状态一致，无需修复');
        }

      } catch (stripeError) {
        console.error('❌ 查询 Stripe 失败:', stripeError.message);

        if (stripeError.code === 'resource_missing') {
          console.log('\n⚠️  Stripe 中找不到订阅，这是孤儿数据！');
          console.log('建议: 清除用户的 Stripe 订阅ID\n');

          // 执行清理
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_plan: 'free',
              subscription_stripe_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('uuid', USER_UUID);

          if (updateError) {
            console.error('❌ 更新失败:', updateError);
          } else {
            console.log('✅ 孤儿订阅数据已清理');
          }
        }
      }
    } else {
      console.log('ℹ️  用户没有 Stripe 订阅ID');
    }

    // 4. 检查积分一致性
    console.log('\n💰 检查积分一致性...\n');

    const { data: lastTransaction } = await supabase
      .from('credits_transactions')
      .select('*')
      .eq('user_uuid', USER_UUID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastTransaction) {
      console.log(`最后交易记录余额: ${lastTransaction.balance_after}`);
      console.log(`用户表中余额: ${user.credits_remaining}`);

      if (lastTransaction.balance_after !== user.credits_remaining) {
        console.log(`\n⚠️  积分数据不一致！差额: ${lastTransaction.balance_after - user.credits_remaining}`);
        console.log('\n可能原因:');
        console.log('  1. 积分被直接修改（绕过交易记录）');
        console.log('  2. 交易记录丢失');
        console.log('\n建议: 需要人工核实并决定正确的积分余额');
      } else {
        console.log('\n✅ 积分数据一致');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 检查完成\n');

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  }
}

fixUserSubscription().catch(console.error);

#!/usr/bin/env node
/**
 * 查询用户积分交易记录
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_UUID = '7504efb3-b01b-59b9-952d-e8afdb1f2969';

async function queryUserCredits() {
  console.log('\n🔍 查询用户积分详情...\n');

  // 1. 查询用户当前状态
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('uuid', USER_UUID)
    .single();

  if (userError) {
    console.error('❌ 查询用户失败:', userError);
    process.exit(1);
  }

  console.log('📋 用户当前状态:');
  console.log('─────────────────────────────────────────');
  console.log(`邮箱: ${user.email}`);
  console.log(`订阅计划: ${user.subscription_plan}`);
  console.log(`订阅状态: ${user.subscription_status}`);
  console.log(`剩余积分: ${user.credits_remaining}`);
  console.log(`Stripe订阅ID: ${user.subscription_stripe_id || 'N/A'}`);
  console.log(`最后更新: ${user.updated_at}`);
  console.log('');

  // 2. 查询所有积分交易记录（不限制数量）
  const { data: transactions, error: transError } = await supabase
    .from('credits_transactions')
    .select('*')
    .eq('user_uuid', USER_UUID)
    .order('created_at', { ascending: true });

  if (transError) {
    console.error('⚠️  查询积分交易失败:', transError.message);
  } else if (!transactions || transactions.length === 0) {
    console.log('📭 暂无积分交易记录\n');
  } else {
    console.log(`💰 积分交易历史 (共 ${transactions.length} 条):`);
    console.log('─────────────────────────────────────────\n');

    let runningBalance = 0;
    transactions.forEach((trans, index) => {
      console.log(`[${index + 1}] ${trans.created_at}`);
      console.log(`    类型: ${trans.transaction_type}`);
      console.log(`    数量: ${trans.credits_amount > 0 ? '+' : ''}${trans.credits_amount}`);
      console.log(`    余额: ${trans.balance_before} → ${trans.balance_after}`);
      runningBalance = trans.balance_after;

      if (trans.description) {
        console.log(`    说明: ${trans.description}`);
      }
      if (trans.consumed_by) {
        console.log(`    消费项: ${trans.consumed_by}`);
      }
      if (trans.metadata && Object.keys(trans.metadata).length > 0) {
        console.log(`    元数据: ${JSON.stringify(trans.metadata)}`);
      }
      console.log('');
    });

    console.log(`最后交易后余额: ${runningBalance}`);
    console.log(`用户表中余额: ${user.credits_remaining}`);

    if (runningBalance !== user.credits_remaining) {
      console.log(`\n⚠️  警告: 交易记录余额 (${runningBalance}) 与用户表余额 (${user.credits_remaining}) 不一致！`);
    }
  }

  // 3. 查询订阅变更历史
  console.log('\n\n📊 订阅变更历史:');
  console.log('─────────────────────────────────────────\n');

  const { data: changes, error: changesError } = await supabase
    .from('subscription_changes')
    .select('*')
    .eq('user_uuid', USER_UUID)
    .order('created_at', { ascending: true });

  if (changesError) {
    console.log('⚠️  无法查询订阅变更记录 (表可能不存在)');
  } else if (!changes || changes.length === 0) {
    console.log('📭 暂无订阅变更记录');
  } else {
    changes.forEach((change, index) => {
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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 查询完成\n');
}

queryUserCredits().catch(console.error);

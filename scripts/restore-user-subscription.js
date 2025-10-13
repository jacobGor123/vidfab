#!/usr/bin/env node
/**
 * 恢复用户订阅状态和积分
 *
 * 用法:
 *   通过 UUID 增加积分:
 *     node scripts/restore-user-subscription.js --user-uuid "xxx" --add-credits 1000
 *
 *   通过 email 增加积分:
 *     node scripts/restore-user-subscription.js --email "user@example.com" --add-credits 500
 *
 *   设置为指定积分总额:
 *     node scripts/restore-user-subscription.js --user-uuid "xxx" --set-credits 5660
 *
 *   修改订阅计划:
 *     node scripts/restore-user-subscription.js --user-uuid "xxx" --plan lite --add-credits 100
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

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    userUuid: null,
    email: null,
    addCredits: null,
    setCredits: null,
    plan: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--user-uuid':
        params.userUuid = args[++i];
        break;
      case '--email':
        params.email = args[++i];
        break;
      case '--add-credits':
        params.addCredits = parseInt(args[++i], 10);
        break;
      case '--set-credits':
        params.setCredits = parseInt(args[++i], 10);
        break;
      case '--plan':
        params.plan = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
用法:
  通过 UUID 增加积分:
    node scripts/restore-user-subscription.js --user-uuid "xxx" --add-credits 1000

  通过 email 增加积分:
    node scripts/restore-user-subscription.js --email "user@example.com" --add-credits 500

  设置为指定积分总额:
    node scripts/restore-user-subscription.js --user-uuid "xxx" --set-credits 5660

  修改订阅计划:
    node scripts/restore-user-subscription.js --user-uuid "xxx" --plan lite --add-credits 100

参数说明:
  --user-uuid    用户UUID（与 --email 二选一）
  --email        用户邮箱（与 --user-uuid 二选一）
  --add-credits  增加的积分数量（与 --set-credits 二选一）
  --set-credits  设置为指定的积分总额（与 --add-credits 二选一）
  --plan         订阅计划（可选: free, lite, pro, unlimited）
        `);
        process.exit(0);
        break;
    }
  }

  // 参数校验
  if (!params.userUuid && !params.email) {
    console.error('❌ 错误: 必须提供 --user-uuid 或 --email 参数');
    console.log('使用 --help 查看帮助');
    process.exit(1);
  }

  if (params.addCredits !== null && params.setCredits !== null) {
    console.error('❌ 错误: --add-credits 和 --set-credits 不能同时使用');
    process.exit(1);
  }

  if (params.addCredits === null && params.setCredits === null && !params.plan) {
    console.error('❌ 错误: 必须提供 --add-credits、--set-credits 或 --plan 参数');
    console.log('使用 --help 查看帮助');
    process.exit(1);
  }

  return params;
}

async function restoreUserSubscription() {
  const params = parseArgs();

  console.log('\n🔧 开始恢复用户订阅状态和积分...\n');

  try {
    let userUuid = params.userUuid;

    // 如果提供的是 email，先查询 UUID
    if (params.email) {
      console.log(`🔍 通过邮箱查找用户: ${params.email}\n`);

      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('uuid, email')
        .eq('email', params.email)
        .single();

      if (emailError || !userByEmail) {
        console.error(`❌ 找不到邮箱为 ${params.email} 的用户`);
        process.exit(1);
      }

      userUuid = userByEmail.uuid;
      console.log(`✅ 找到用户: ${userByEmail.email} (UUID: ${userUuid})\n`);
    }

    // 1. 获取当前状态
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', userUuid)
      .single();

    if (fetchError || !currentUser) {
      console.error('❌ 用户不存在');
      process.exit(1);
    }

    // 计算新的积分值
    let newCredits = currentUser.credits_remaining;
    if (params.addCredits !== null) {
      newCredits = currentUser.credits_remaining + params.addCredits;
    } else if (params.setCredits !== null) {
      newCredits = params.setCredits;
    }

    const newPlan = params.plan || currentUser.subscription_plan;

    console.log('📋 当前状态:');
    console.log('─────────────────────────────────────────');
    console.log(`邮箱: ${currentUser.email}`);
    console.log(`订阅计划: ${currentUser.subscription_plan} → ${newPlan}`);
    console.log(`剩余积分: ${currentUser.credits_remaining} → ${newCredits}`);
    console.log('');

    // 2. 执行修复
    console.log('⚙️  执行修复...\n');

    const updateData = {
      credits_remaining: newCredits,
      updated_at: new Date().toISOString(),
    };

    if (params.plan) {
      updateData.subscription_plan = params.plan;
      updateData.subscription_status = 'active';
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('uuid', userUuid)
      .select()
      .single();

    if (updateError) {
      console.error('❌ 更新失败:', updateError);
      process.exit(1);
    }

    console.log('✅ 用户状态已更新\n');

    // 3. 记录修复操作到交易表
    const creditsDiff = newCredits - currentUser.credits_remaining;

    if (creditsDiff !== 0) {
      const transactionType = creditsDiff > 0 ? 'bonus' : 'deduction';
      const description = params.addCredits !== null
        ? `管理员操作：增加积分 ${params.addCredits}`
        : params.setCredits !== null
        ? `管理员操作：设置积分总额为 ${params.setCredits}`
        : `管理员操作：调整积分`;

      const { error: transError } = await supabase
        .from('credits_transactions')
        .insert({
          user_uuid: userUuid,
          transaction_type: transactionType,
          credits_amount: creditsDiff,
          balance_before: currentUser.credits_remaining,
          balance_after: newCredits,
          description: description,
          metadata: {
            reason: 'admin_adjustment',
            adjusted_at: new Date().toISOString(),
            adjusted_by: 'restore-user-subscription-script',
            previous_balance: currentUser.credits_remaining,
            new_balance: newCredits,
            adjustment_type: params.addCredits !== null ? 'add' : 'set',
            admin_operation: true,
          },
        });

      if (transError) {
        console.warn('⚠️  无法记录积分交易（非致命错误）:', transError.message);
      } else {
        console.log('✅ 积分变更已记录到交易表\n');
      }
    }

    // 4. 显示修复后的状态
    console.log('📊 修复后的状态:');
    console.log('─────────────────────────────────────────');
    console.log(`邮箱: ${updatedUser.email}`);
    console.log(`订阅计划: ${updatedUser.subscription_plan}`);
    console.log(`订阅状态: ${updatedUser.subscription_status}`);
    console.log(`剩余积分: ${updatedUser.credits_remaining}`);
    console.log(`Stripe订阅ID: ${updatedUser.subscription_stripe_id || 'N/A'}`);
    console.log(`最后更新: ${updatedUser.updated_at}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 修复完成！\n');

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  }
}

restoreUserSubscription().catch(console.error);

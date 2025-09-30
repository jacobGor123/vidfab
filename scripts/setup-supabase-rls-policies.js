/**
 * 设置Supabase RLS政策以确保服务角色可以访问所有数据
 * 这个脚本通过supabaseAdmin直接执行SQL命令
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 缺少必要的环境变量');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupRLSPolicies() {
  console.log('🔧 开始设置Supabase RLS政策...');

  try {
    // 检查当前用户数据访问
    console.log('\n📋 检查当前数据访问状态...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, credits_remaining')
      .limit(3);

    if (usersError) {
      console.error('❌ 用户数据访问失败:', usersError);
    } else {
      console.log('✅ 找到用户数据:', users?.length || 0, '条记录');
      if (users && users.length > 0) {
        console.log('示例用户积分:', users.map(u => ({
          email: u.email,
          credits: u.credits_remaining
        })));
      }
    }

    // 创建服务角色管理政策的SQL命令
    const rlsPolicies = [
      // Users表管理政策
      {
        name: 'Service role can manage users',
        table: 'users',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage users" ON users;
          CREATE POLICY "Service role can manage users" ON users
          FOR ALL TO service_role
          USING (true) WITH CHECK (true);
        `
      },

      // Subscriptions表管理政策
      {
        name: 'Service role can manage subscriptions',
        table: 'subscriptions',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
          CREATE POLICY "Service role can manage subscriptions" ON subscriptions
          FOR ALL TO service_role
          USING (true) WITH CHECK (true);
        `
      },

      // Subscription orders表管理政策
      {
        name: 'Service role can manage subscription_orders',
        table: 'subscription_orders',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage subscription_orders" ON subscription_orders;
          CREATE POLICY "Service role can manage subscription_orders" ON subscription_orders
          FOR ALL TO service_role
          USING (true) WITH CHECK (true);
        `
      },

      // User videos表管理政策
      {
        name: 'Service role can manage user_videos',
        table: 'user_videos',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage user_videos" ON user_videos;
          CREATE POLICY "Service role can manage user_videos" ON user_videos
          FOR ALL TO service_role
          USING (true) WITH CHECK (true);
        `
      },

      // Credits transactions表管理政策
      {
        name: 'Service role can manage credits_transactions',
        table: 'credits_transactions',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage credits_transactions" ON credits_transactions;
          CREATE POLICY "Service role can manage credits_transactions" ON credits_transactions
          FOR ALL TO service_role
          USING (true) WITH CHECK (true);
        `
      }
    ];

    console.log('\n🛡️  设置RLS管理政策...');

    for (const policy of rlsPolicies) {
      try {
        console.log(`设置 ${policy.table} 表的政策...`);

        // 通过Supabase的rpc调用执行SQL
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: policy.sql
        });

        if (error) {
          console.warn(`⚠️  无法通过RPC执行政策 ${policy.name}:`, error.message);

          // 如果RPC失败，尝试通过直接SQL查询的方式
          // 由于Supabase限制，我们需要另想办法
          console.log(`ℹ️  政策 ${policy.name} 需要手动在Supabase控制台设置`);
        } else {
          console.log(`✅ ${policy.name} 政策设置成功`);
        }
      } catch (err) {
        console.warn(`⚠️  设置政策 ${policy.name} 时出错:`, err.message);
      }
    }

    // 验证权限修复效果
    console.log('\n🧪 验证权限修复效果...');

    const { data: testUsers, error: testError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, credits_remaining, subscription_plan, subscription_status')
      .limit(2);

    if (testError) {
      console.error('❌ 权限验证失败:', testError);
    } else {
      console.log('✅ 权限验证成功！');
      console.log('示例用户数据:');
      testUsers?.forEach(user => {
        console.log(`  - ${user.email}: ${user.credits_remaining} 积分, ${user.subscription_plan} 计划`);
      });
    }

    // 测试有积分的用户
    const { data: creditUsers, error: creditError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, credits_remaining')
      .gt('credits_remaining', 0)
      .limit(5);

    if (creditError) {
      console.error('❌ 积分用户查询失败:', creditError);
    } else {
      console.log(`\n💰 找到 ${creditUsers?.length || 0} 个有积分的用户:`);
      creditUsers?.forEach(user => {
        console.log(`  - ${user.email}: ${user.credits_remaining} 积分`);
      });
    }

  } catch (error) {
    console.error('❌ RLS设置过程中发生错误:', error);
  }

  console.log('\n✅ RLS政策设置完成');
}

// 执行设置
setupRLSPolicies().catch(console.error);
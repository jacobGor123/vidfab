/**
 * 测试数据库访问和权限
 */

const { createClient } = require('@supabase/supabase-js');

// 直接从环境变量加载配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycahbhhuzgixfrljtqmi.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYWhiaGh1emdpeGZybGp0cW1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY3MjY5MywiZXhwIjoyMDczMjQ4NjkzfQ.6m3rFAvKN10N_IrFgYbVxF48280b0dCj1x7VjRRtVcI';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
  },
});

async function testDatabaseAccess() {
  console.log('🔍 测试数据库访问权限...');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 使用服务密钥访问');

  try {
    // 1. 测试基本用户数据访问
    console.log('\n📋 1. 测试用户数据访问...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, credits_remaining, subscription_plan, subscription_status')
      .limit(5);

    if (usersError) {
      console.error('❌ 用户数据访问失败:', usersError);
    } else {
      console.log('✅ 用户数据访问成功!');
      console.log(`找到 ${users?.length || 0} 个用户:`);
      users?.forEach(user => {
        console.log(`  - ${user.email}: ${user.credits_remaining} 积分, ${user.subscription_plan} 计划, ${user.subscription_status} 状态`);
      });
    }

    // 2. 查找有积分的用户
    console.log('\n💰 2. 查找有积分的用户...');
    const { data: creditUsers, error: creditError } = await supabaseAdmin
      .from('users')
      .select('uuid, email, credits_remaining')
      .gt('credits_remaining', 0)
      .order('credits_remaining', { ascending: false })
      .limit(10);

    if (creditError) {
      console.error('❌ 积分用户查询失败:', creditError);
    } else {
      console.log(`✅ 找到 ${creditUsers?.length || 0} 个有积分的用户:`);
      creditUsers?.forEach(user => {
        console.log(`  - ${user.email}: ${user.credits_remaining} 积分`);
      });
    }

    // 3. 测试特定用户查询（使用之前找到的UUID）
    console.log('\n🎯 3. 测试特定用户查询...');
    const testUuid = '13b23625-0790-40ef-95c4-a4afc5913e10';
    const { data: specificUser, error: specificError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uuid', testUuid)
      .single();

    if (specificError) {
      console.error('❌ 特定用户查询失败:', specificError);
    } else {
      console.log('✅ 特定用户查询成功!');
      console.log(`用户: ${specificUser.email}`);
      console.log(`积分: ${specificUser.credits_remaining}`);
      console.log(`订阅: ${specificUser.subscription_plan} (${specificUser.subscription_status})`);
    }

    // 4. 测试用户积分更新权限
    console.log('\n✏️  4. 测试积分更新权限...');
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('uuid', testUuid)
      .select('uuid, email, credits_remaining, updated_at');

    if (updateError) {
      console.error('❌ 用户更新失败:', updateError);
    } else {
      console.log('✅ 用户更新成功!');
      console.log('更新结果:', updateResult);
    }

    // 5. 测试订阅表访问
    console.log('\n📊 5. 测试订阅表访问...');
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .limit(3);

    if (subError) {
      console.error('❌ 订阅表访问失败:', subError);
    } else {
      console.log(`✅ 订阅表访问成功! 找到 ${subscriptions?.length || 0} 条记录`);
    }

    // 6. 测试积分交易表访问
    console.log('\n💳 6. 测试积分交易表访问...');
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('credits_transactions')
      .select('*')
      .limit(3);

    if (transError) {
      console.error('❌ 积分交易表访问失败:', transError);
    } else {
      console.log(`✅ 积分交易表访问成功! 找到 ${transactions?.length || 0} 条记录`);
    }

    console.log('\n🎉 数据库权限测试完成!');
    console.log('🔧 如果上述测试都成功，说明Supabase权限配置正确。');

  } catch (error) {
    console.error('💥 测试过程中发生致命错误:', error);
  }
}

// 执行测试
testDatabaseAccess().catch(console.error);
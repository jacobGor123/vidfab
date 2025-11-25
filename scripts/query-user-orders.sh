#!/bin/bash

# Query User Orders Script
# 用于查询指定用户的订单信息

set -e

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 获取用户邮箱参数
USER_EMAIL=${1:-"danielle.wen1994@gmail.com"}

echo "=========================================="
echo "查询用户订单信息: $USER_EMAIL"
echo "=========================================="

# 使用 Node.js 脚本查询数据库
node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryUserOrders() {
  try {
    // 1. 先查找用户
    console.log('\n1. 查询用户信息...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('uuid, email, nickname, created_at, subscription_status, subscription_plan, credits_remaining')
      .eq('email', '$USER_EMAIL');

    if (userError) {
      console.error('查询用户失败:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ 未找到该邮箱对应的用户');
      return;
    }

    const user = users[0];
    console.log('✅ 找到用户:');
    console.log('   UUID:', user.uuid);
    console.log('   邮箱:', user.email);
    console.log('   昵称:', user.nickname);
    console.log('   注册时间:', user.created_at);
    console.log('   订阅状态:', user.subscription_status);
    console.log('   订阅计划:', user.subscription_plan);
    console.log('   剩余积分:', user.credits_remaining);

    // 2. 查询该用户的所有订单
    console.log('\n2. 查询订单信息...');
    const { data: orders, error: orderError } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('user_uuid', user.uuid)
      .order('created_at', { ascending: false });

    if (orderError) {
      console.error('查询订单失败:', orderError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('❌ 该用户没有任何订单');
      return;
    }

    console.log(\`✅ 找到 \${orders.length} 个订单\`);

    // 3. 统计订单状态
    const statusCount = {};
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    console.log('\n3. 订单状态统计:');
    Object.keys(statusCount).forEach(status => {
      console.log(\`   \${status}: \${statusCount[status]} 个\`);
    });

    // 4. 显示今天的 pending 订单
    const today = new Date().toISOString().split('T')[0];
    const todayPendingOrders = orders.filter(order => {
      const orderDate = order.created_at.split('T')[0];
      return order.status === 'pending' && orderDate === today;
    });

    console.log(\`\n4. 今天(${today})的 pending 订单: \${todayPendingOrders.length} 个\`);

    if (todayPendingOrders.length > 0) {
      console.log('\n详细信息:');
      todayPendingOrders.forEach((order, index) => {
        console.log(\`\n   订单 #\${index + 1}:\`);
        console.log(\`   - ID: \${order.id}\`);
        console.log(\`   - 创建时间: \${order.created_at}\`);
        console.log(\`   - 计划: \${order.plan_id}\`);
        console.log(\`   - 周期: \${order.billing_cycle}\`);
        console.log(\`   - 金额: $\${(order.amount_cents / 100).toFixed(2)}\`);
        console.log(\`   - Stripe Session: \${order.stripe_checkout_session_id || 'N/A'}\`);
        console.log(\`   - Stripe Subscription: \${order.stripe_subscription_id || 'N/A'}\`);
        console.log(\`   - 元数据: \${JSON.stringify(order.metadata || {})}\`);
      });
    }

    // 5. 显示所有 pending 订单
    const allPendingOrders = orders.filter(order => order.status === 'pending');

    if (allPendingOrders.length > todayPendingOrders.length) {
      console.log(\`\n5. 历史 pending 订单: \${allPendingOrders.length - todayPendingOrders.length} 个\`);

      const historicalPending = allPendingOrders.filter(order => {
        const orderDate = order.created_at.split('T')[0];
        return orderDate !== today;
      });

      historicalPending.forEach((order, index) => {
        console.log(\`\n   订单 #\${index + 1}:\`);
        console.log(\`   - ID: \${order.id}\`);
        console.log(\`   - 创建时间: \${order.created_at}\`);
        console.log(\`   - 计划: \${order.plan_id}\`);
        console.log(\`   - 周期: \${order.billing_cycle}\`);
        console.log(\`   - 金额: $\${(order.amount_cents / 100).toFixed(2)}\`);
      });
    }

  } catch (error) {
    console.error('查询过程出错:', error);
  }

  process.exit(0);
}

queryUserOrders();
"

echo ""
echo "=========================================="
echo "查询完成"
echo "=========================================="

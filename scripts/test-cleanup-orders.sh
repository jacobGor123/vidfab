#!/bin/bash

# Test Cleanup Orders Script
# 测试批量清理订单功能

set -e

HOURS=${1:-1}

echo "=========================================="
echo "测试批量清理订单功能"
echo "=========================================="
echo "清理阈值: $HOURS 小时"
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCleanup() {
  try {
    const hoursThreshold = $HOURS;
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    console.log('1. 查询过期的 pending 订单...');
    console.log('   截止时间:', thresholdDate.toISOString());
    console.log('');

    const { data: expiredOrders, error: queryError } = await supabase
      .from('subscription_orders')
      .select('id, user_uuid, plan_id, billing_cycle, amount_cents, created_at, status')
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (queryError) {
      console.error('❌ 查询失败:', queryError);
      process.exit(1);
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('   ✅ 没有需要清理的订单');
      process.exit(0);
    }

    console.log(\`   找到 \${expiredOrders.length} 个过期订单:\`);
    expiredOrders.forEach((order, index) => {
      console.log(\`   \${index + 1}. \${order.plan_id} \${order.billing_cycle} - $\${(order.amount_cents / 100).toFixed(2)} (创建于 \${order.created_at})\`);
    });
    console.log('');

    console.log('2. 批量更新订单状态...');
    const { error: updateError } = await supabase
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: \`Auto-cancelled: Payment not completed within \${hoursThreshold} hours\`,
      })
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (updateError) {
      console.error('❌ 更新失败:', updateError);
      process.exit(1);
    }

    console.log(\`   ✅ 成功更新 \${expiredOrders.length} 个订单\`);
    console.log('');

    console.log('3. 验证更新结果...');
    const orderIds = expiredOrders.map(o => o.id);
    const { data: updatedOrders, error: verifyError } = await supabase
      .from('subscription_orders')
      .select('id, status')
      .in('id', orderIds);

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError);
      process.exit(1);
    }

    const cancelledCount = updatedOrders.filter(o => o.status === 'cancelled').length;
    console.log(\`   已取消: \${cancelledCount} / \${orderIds.length}\`);

    if (cancelledCount === orderIds.length) {
      console.log('');
      console.log('✅ 测试成功! 所有过期订单已被清理');
    } else {
      console.log('');
      console.log('⚠️  部分订单未正确更新');
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    process.exit(1);
  }

  process.exit(0);
}

testCleanup();
"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="

#!/bin/bash

# Simple Cleanup Test
# 简单清理测试

set -e

HOURS=${1:-1}

echo "=========================================="
echo "批量清理过期订单"
echo "=========================================="
echo "清理阈值: $HOURS 小时"
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

node << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const hoursThreshold = parseInt(process.argv[1] || '1');

async function cleanup() {
  try {
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    console.log('1. 查询过期订单...');
    console.log('   截止时间:', thresholdDate.toISOString());

    const { data: orders, error: queryError } = await supabase
      .from('subscription_orders')
      .select('id, plan_id, billing_cycle, amount_cents, created_at')
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (queryError) {
      console.error('❌ 查询失败:', queryError.message);
      process.exit(1);
    }

    if (!orders || orders.length === 0) {
      console.log('   ✅ 没有需要清理的订单');
      process.exit(0);
    }

    console.log(`   找到 ${orders.length} 个过期订单`);
    orders.forEach((order, i) => {
      console.log(`   ${i + 1}. ${order.plan_id} ${order.billing_cycle} - $${(order.amount_cents / 100).toFixed(2)}`);
    });

    console.log('\n2. 批量取消订单...');
    const { error: updateError } = await supabase
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: `Auto-cancelled: Payment not completed within ${hoursThreshold} hours`,
      })
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (updateError) {
      console.error('❌ 更新失败:', updateError.message);
      process.exit(1);
    }

    console.log(`   ✅ 成功取消 ${orders.length} 个订单\n`);
    console.log('✅ 清理完成!');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

cleanup();
EOF

echo ""
echo "=========================================="

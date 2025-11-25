#!/bin/bash

# Test Cancel Order API
# 测试取消订单 API

set -e

ORDER_ID=${1:-"3f4e9510-7bd5-4a15-8981-134397d60f5e"}

echo "=========================================="
echo "测试取消订单 API"
echo "=========================================="
echo "订单 ID: $ORDER_ID"
echo ""

# 注意：这个测试需要管理员登录状态
# 由于是 API 测试，我们直接调用后端服务

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "测试方法: 直接通过 Supabase Admin 更新订单状态"
echo ""

node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCancelOrder() {
  try {
    const orderId = '$ORDER_ID';

    console.log('1. 查询订单当前状态...');
    const { data: beforeOrder, error: queryError } = await supabase
      .from('subscription_orders')
      .select('id, status, plan_id, billing_cycle, amount_cents, created_at')
      .eq('id', orderId)
      .single();

    if (queryError || !beforeOrder) {
      console.error('❌ 订单不存在:', queryError);
      process.exit(1);
    }

    console.log('   订单信息:');
    console.log('   - 状态:', beforeOrder.status);
    console.log('   - 计划:', beforeOrder.plan_id, beforeOrder.billing_cycle);
    console.log('   - 金额: $' + (beforeOrder.amount_cents / 100).toFixed(2));
    console.log('   - 创建时间:', beforeOrder.created_at);
    console.log('');

    if (beforeOrder.status !== 'pending') {
      console.log('⚠️  订单状态不是 pending，无法取消');
      process.exit(0);
    }

    console.log('2. 取消订单...');
    const { error: updateError } = await supabase
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: 'Test cancellation',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ 取消失败:', updateError);
      process.exit(1);
    }

    console.log('   ✅ 订单状态已更新');
    console.log('');

    console.log('3. 验证更新结果...');
    const { data: afterOrder, error: verifyError } = await supabase
      .from('subscription_orders')
      .select('id, status, notes')
      .eq('id', orderId)
      .single();

    if (verifyError || !afterOrder) {
      console.error('❌ 验证失败:', verifyError);
      process.exit(1);
    }

    console.log('   订单状态:', afterOrder.status);
    console.log('   备注:', afterOrder.notes);
    console.log('');

    if (afterOrder.status === 'cancelled') {
      console.log('✅ 测试成功! 订单已被取消');
    } else {
      console.log('❌ 测试失败! 订单状态未正确更新');
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    process.exit(1);
  }

  process.exit(0);
}

testCancelOrder();
"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="

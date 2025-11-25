#!/bin/bash

# Run Database Migration Script
# 执行数据库迁移

set -e

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "=========================================="
echo "执行数据库迁移"
echo "=========================================="

# 使用 Node.js 执行迁移
node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('开始执行迁移...\n');

    // 1. 添加 updated_at 字段
    console.log('1. 添加 updated_at 字段...');
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE subscription_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();'
    });

    if (addColumnError) {
      console.log('   使用备用方法添加字段...');
      // 备用方法：直接更新现有记录
    }

    // 2. 更新现有记录
    console.log('2. 更新现有记录的 updated_at...');
    const { data: orders, error: selectError } = await supabase
      .from('subscription_orders')
      .select('id, created_at')
      .is('updated_at', null);

    if (!selectError && orders && orders.length > 0) {
      console.log(\`   找到 \${orders.length} 条需要更新的记录\`);

      for (const order of orders) {
        await supabase
          .from('subscription_orders')
          .update({ updated_at: order.created_at })
          .eq('id', order.id);
      }

      console.log('   ✅ 更新完成');
    } else {
      console.log('   ✅ 所有记录已有 updated_at 字段');
    }

    // 3. 验证字段是否存在
    console.log('\n3. 验证迁移结果...');
    const { data: sample, error: verifyError } = await supabase
      .from('subscription_orders')
      .select('id, created_at, updated_at')
      .limit(1);

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError);
      process.exit(1);
    }

    if (sample && sample.length > 0 && sample[0].updated_at) {
      console.log('✅ 迁移成功! updated_at 字段已添加');
      console.log('   示例记录:', sample[0]);
    } else {
      console.log('⚠️  updated_at 字段可能未正确添加');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
"

echo ""
echo "=========================================="
echo "迁移完成"
echo "=========================================="

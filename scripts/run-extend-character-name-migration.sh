#!/bin/bash

# Run Database Migration Script
# 执行数据库迁移：扩展 character_name 字段长度

set -e

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "=========================================="
echo "执行数据库迁移: 扩展 character_name 字段"
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

    // 扩展 character_name 字段从 VARCHAR(100) 到 VARCHAR(500)
    console.log('1. 扩展 character_name 字段长度 (VARCHAR(100) -> VARCHAR(500))...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE project_characters ALTER COLUMN character_name TYPE VARCHAR(500);'
    });

    if (error) {
      console.error('❌ 迁移失败:', error);
      console.log('\n备用方案: 请手动在 Supabase Dashboard 执行以下 SQL:');
      console.log('ALTER TABLE project_characters ALTER COLUMN character_name TYPE VARCHAR(500);');
      process.exit(1);
    }

    console.log('✅ 字段扩展成功');

    // 验证迁移结果
    console.log('\n2. 验证迁移结果...');
    const { data: sample } = await supabase
      .from('project_characters')
      .select('character_name')
      .limit(1);

    if (sample && sample.length > 0) {
      console.log('✅ 迁移验证成功!');
      console.log('   示例角色:', sample[0].character_name);
    }

    console.log('\n✅ 迁移完成! character_name 字段现在支持最多 500 个字符');

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

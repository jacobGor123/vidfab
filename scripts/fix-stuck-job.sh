#!/bin/bash
# 立即修复线上卡住的合成任务
#
# 用法: ./scripts/fix-stuck-job.sh <project-id>
# 示例: ./scripts/fix-stuck-job.sh 56479fd4-c0e8-435d-a535-814d3d11a4bb

set -e

PROJECT_ID="$1"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ 错误：请提供项目 ID"
  echo "用法: ./scripts/fix-stuck-job.sh <project-id>"
  exit 1
fi

# 加载环境变量
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "🔧 正在修复卡住的任务..."
echo "项目 ID: $PROJECT_ID"
echo ""

# 方法1：直接修改数据库（最快）
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const projectId = '$PROJECT_ID';

  // 1. 查询当前状态
  const { data: before } = await supabase
    .from('video_agent_projects')
    .select('status, step_6_status')
    .eq('id', projectId)
    .single();

  console.log('📊 当前状态:', JSON.stringify(before, null, 2));

  // 2. 重置为 failed 状态
  const { error } = await supabase
    .from('video_agent_projects')
    .update({
      status: 'failed',
      step_6_status: 'failed'
    })
    .eq('id', projectId);

  if (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }

  // 3. 验证更新
  const { data: after } = await supabase
    .from('video_agent_projects')
    .select('status, step_6_status')
    .eq('id', projectId)
    .single();

  console.log('');
  console.log('✅ 修复成功！');
  console.log('新状态:', JSON.stringify(after, null, 2));
  console.log('');
  console.log('💡 下一步：刷新前端页面，点击\"Retry Composition\"重新触发合成');
})();
"

echo ""
echo "================================"
echo "✅ 任务已重置为 failed 状态"
echo "用户可以在前端重新触发合成"
echo "================================"

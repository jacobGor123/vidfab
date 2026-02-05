#!/bin/bash

# ==================================================
# 修复分镜图历史版本 URL 缺失问题
# 问题：save_storyboard_with_history 缺少 image_url_external 和 storage_status
# 解决：更新数据库函数，增加这两个参数
# ==================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/lib/database/migrations/fix-storyboard-history-urls.sql"

echo "=================================================="
echo "修复分镜图历史版本 URL 缺失问题"
echo "=================================================="

# 检查迁移文件是否存在
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "错误：迁移文件不存在: $MIGRATION_FILE"
  exit 1
fi

# 检查环境变量
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "错误：环境变量 SUPABASE_DB_URL 未设置"
  echo "请在 .env.local 中设置 SUPABASE_DB_URL"
  exit 1
fi

echo ""
echo "准备执行数据库迁移..."
echo "文件: $MIGRATION_FILE"
echo ""

# 显示迁移文件内容的前20行
echo "--- 迁移内容预览 ---"
head -n 20 "$MIGRATION_FILE"
echo "..."
echo ""

# 确认执行
read -p "是否执行此迁移? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "迁移已取消"
  exit 0
fi

# 执行迁移
echo ""
echo "执行迁移中..."
psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "=================================================="
  echo "✅ 迁移成功完成！"
  echo "=================================================="
  echo ""
  echo "修复内容："
  echo "1. save_storyboard_with_history 函数增加了 image_url_external 参数"
  echo "2. save_storyboard_with_history 函数增加了 storage_status 参数"
  echo ""
  echo "现在重新生成分镜图时，主图和预览图应该能正常显示了。"
  echo ""
else
  echo ""
  echo "=================================================="
  echo "❌ 迁移失败！"
  echo "=================================================="
  echo ""
  echo "请检查错误信息并手动执行迁移文件："
  echo "psql \$SUPABASE_DB_URL -f $MIGRATION_FILE"
  echo ""
  exit 1
fi

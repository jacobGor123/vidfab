#!/bin/bash

# VidFab订阅系统数据库修复脚本
# 修复Supabase 406错误

echo "🔥 开始修复VidFab订阅系统数据库schema..."

# 定义数据库文件路径
SCHEMA_FIX_SQL="/Users/jacob/Desktop/vidfab/lib/database/fix-subscription-schema.sql"
SUBSCRIPTION_SCHEMA_SQL="/Users/jacob/Desktop/vidfab/lib/database/subscription-schema.sql"

echo "📋 将要执行的修复步骤："
echo "  1. 删除现有约束冲突"
echo "  2. 更新subscription_plan字段约束"
echo "  3. 迁移现有数据"
echo "  4. 创建订阅系统相关表和函数"
echo "  5. 验证修复结果"

echo ""
echo "⚠️  请确保你有Supabase管理员权限，并将以下SQL脚本在Supabase SQL编辑器中执行："
echo ""

echo "=== 第1步：Schema修复脚本 ==="
echo "文件路径: $SCHEMA_FIX_SQL"
echo "内容："
cat "$SCHEMA_FIX_SQL"

echo ""
echo "=== 第2步：订阅系统Schema ==="
echo "文件路径: $SUBSCRIPTION_SCHEMA_SQL"
echo "🔄 订阅系统相关表和函数已在该文件中定义"

echo ""
echo "📝 手动执行步骤："
echo "  1. 打开Supabase Dashboard -> SQL编辑器"
echo "  2. 复制并执行第1步的Schema修复脚本"
echo "  3. 确认无错误后，执行第2步的订阅系统Schema"
echo "  4. 验证users表已包含正确的subscription_plan约束"

echo ""
echo "✅ 预期修复结果："
echo "  - subscription_plan字段支持: free, lite, pro, premium, basic, enterprise"
echo "  - 所有现有'basic'记录迁移为'free'"
echo "  - 所有现有'enterprise'记录迁移为'premium'"
echo "  - users表查询不再产生406错误"

echo ""
echo "🧪 测试验证命令："
echo "  在Supabase SQL编辑器中执行："
echo "  SELECT subscription_plan, COUNT(*) FROM users GROUP BY subscription_plan;"

echo ""
echo "🔥 修复完成！请手动执行上述SQL脚本以解决406错误。"
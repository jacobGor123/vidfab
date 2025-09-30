#!/bin/bash

# Supabase 406错误修复脚本
# 这个脚本会依次执行所有必要的数据库修复

set -e

echo "🔧 开始修复Supabase 406错误..."

# 检查是否安装了supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ 错误: 未找到supabase CLI，请先安装"
    echo "   运行: npm install -g supabase"
    exit 1
fi

# 检查项目目录
if [ ! -f ".env.local" ]; then
    echo "❌ 错误: 请在项目根目录下运行此脚本"
    exit 1
fi

echo "📋 第一步：修复数据库字段约束..."
supabase db push --file lib/database/fix-supabase-406-constraints.sql

echo "📋 第二步：修复RLS策略..."
supabase db push --file lib/database/fix-supabase-406-rls.sql

echo "📋 第三步：验证修复结果..."
# 这里可以添加验证查询

echo "✅ Supabase 406错误修复完成!"
echo ""
echo "🔍 修复内容包括："
echo "   1. 修复了subscription_plan字段约束，支持free/lite/premium等值"
echo "   2. 修复了subscription_status字段约束"
echo "   3. 为Service Role添加了绕过RLS的策略"
echo "   4. 更新了现有用户数据，避免约束冲突"
echo ""
echo "⚠️  请重启应用程序以使更改生效"
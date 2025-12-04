#!/bin/bash

# Blog Database Migration Script
# 执行博客系统数据库迁移

set -e

echo "🚀 Starting blog database migration..."
echo ""

# 加载环境变量
if [ -f .env.local ]; then
  echo "📝 Loading environment variables from .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "❌ Error: .env.local file not found"
  exit 1
fi

# 检查必需的环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials"
  echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
  exit 1
fi

echo "✅ Environment variables loaded"
echo "📊 Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# 执行迁移脚本
echo "🔧 Running migration script..."
npx tsx scripts/db/run-blog-migration.ts

echo ""
echo "✨ Migration completed successfully!"

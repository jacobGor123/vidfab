#!/bin/bash

# VidFab AI Video Platform - Docker Start Script
# Author: VidFab Team
# Description: Start the complete Docker environment with logging

set -e

echo "🐳 Starting VidFab Docker Environment..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/docker-start-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Check environment variables configuration
echo "🔍 Checking environment configuration..."

if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo ""
    echo "❌ 错误: 未找到 .env 或 .env.local 文件"
    echo ""
    echo "Docker 构建需要环境变量配置。请选择以下方式之一："
    echo ""
    echo "方式 1: 从模板创建（推荐新用户）"
    echo "  cp .env.example .env.local"
    echo "  nano .env.local  # 编辑并填入实际值"
    echo ""
    echo "方式 2: 使用已有的 .env.local"
    echo "  如果您已有 .env.local 文件，请确保它在项目根目录"
    echo ""
    echo "详细说明请查看: docs/deployment-guide.md"
    echo ""
    exit 1
fi

# If only .env.local exists, extract Docker-required variables to .env
if [ ! -f .env ] && [ -f .env.local ]; then
    echo "📝 从 .env.local 提取 Docker 构建所需变量..."
    {
        grep "^NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=" .env.local || echo "NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true"
        grep "^NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=" .env.local || echo "NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=true"
        grep "^NEXT_PUBLIC_AUTH_GOOGLE_ID=" .env.local || true
        grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local || true
        grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local || true
        grep "^NEXT_PUBLIC_APP_URL=" .env.local || echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
        grep "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=" .env.local || true
        grep "^NODE_ENV=" .env.local || echo "NODE_ENV=production"
        grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local || true
    } > .env 2>/dev/null
    echo "✅ 已创建 .env 文件"
fi

# Verify critical environment variables
echo "🔍 验证关键环境变量..."
MISSING_VARS=""

if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env 2>/dev/null; then
    MISSING_VARS="${MISSING_VARS}\n  - NEXT_PUBLIC_SUPABASE_URL"
fi

if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env 2>/dev/null; then
    MISSING_VARS="${MISSING_VARS}\n  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env 2>/dev/null; then
    MISSING_VARS="${MISSING_VARS}\n  - SUPABASE_SERVICE_ROLE_KEY"
fi

if [ ! -z "$MISSING_VARS" ]; then
    echo ""
    echo "⚠️  警告: 缺少关键环境变量:"
    echo -e "$MISSING_VARS"
    echo ""
    echo "应用可能无法正常运行。请在 .env.local 中配置这些变量。"
    echo "详细说明: docs/deployment-guide.md"
    echo ""
    read -p "是否继续启动? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ 环境配置检查通过"
echo ""

# Start all services in detached mode
echo "🚀 Starting all services..."
docker compose up -d 2>&1 | tee "$LOG_FILE"

# Wait a moment for services to initialize
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check service status
echo "🔍 Checking service status..."
docker compose ps 2>&1 | tee -a "$LOG_FILE"

echo ""
echo "✅ VidFab Docker Environment started successfully!"
echo "📋 Start log saved to: $LOG_FILE"
echo ""
echo "🌐 Application should be available at:"
echo "   - Main app: http://localhost:${PORT:-3000}"
echo "   - Redis Commander: http://localhost:8081 (admin/admin123)"
echo ""
echo "💡 Useful commands:"
echo "   - './scripts/docker-logs.sh' - View application logs"
echo "   - './scripts/docker-stop.sh' - Stop all services"
echo "   - 'docker compose ps' - Check service status"
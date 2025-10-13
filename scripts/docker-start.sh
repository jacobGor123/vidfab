#!/bin/bash

# VidFab AI Video Platform - Docker Start Script
# Author: VidFab Team
# Description: Start the complete Docker environment with logging

set -e

echo "🐳 Starting VidFab Docker Environment..."

# Check if Docker daemon is running
echo "🔍 检查 Docker 服务..."
if ! docker info >/dev/null 2>&1; then
    echo ""
    echo "❌ 错误: Docker daemon 未运行"
    echo ""
    echo "请先启动 Docker Desktop:"
    echo "  1. 打开 Docker Desktop 应用"
    echo "  2. 等待 Docker 完全启动（菜单栏图标显示运行状态）"
    echo "  3. 重新运行此脚本"
    echo ""
    echo "验证 Docker 是否运行:"
    echo "  docker ps"
    echo ""
    exit 1
fi
echo "✅ Docker 服务正在运行"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/docker-start-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Check environment variables configuration
echo "🔍 Checking environment configuration..."

# 检查配置文件是否存在
if [ -f .env ]; then
    echo "✅ 使用现有的 .env 文件"
elif [ -f .env.local ]; then
    echo "📝 未找到 .env，从 .env.local 复制配置..."
    cp .env.local .env
    echo "✅ 已从 .env.local 创建 .env 文件"
else
    echo ""
    echo "❌ 错误: 未找到 .env 或 .env.local 文件"
    echo ""
    echo "Docker 需要环境变量配置。请选择以下方式之一："
    echo ""
    echo "方式 1: 从模板创建 .env 文件（推荐生产环境）"
    echo "  cp .env.example .env"
    echo "  nano .env  # 编辑并填入实际值"
    echo ""
    echo "方式 2: 从模板创建 .env.local 文件（推荐开发环境）"
    echo "  cp .env.example .env.local"
    echo "  nano .env.local  # 编辑并填入实际值"
    echo "  # 脚本会自动从 .env.local 复制到 .env"
    echo ""
    echo "💡 提示："
    echo "  - .env 文件优先级更高，推荐生产环境使用"
    echo "  - .env.local 适合开发环境，会自动转换为 .env"
    echo ""
    echo "详细说明: docs/ops-deployment-guide.md"
    echo ""
    exit 1
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

# Check if Redis is running
echo "🔍 检查 Redis 服务..."
if docker ps --format '{{.Names}}' | grep -q "vidfab-redis-standalone"; then
    echo "✅ Redis 服务正在运行"

    # Test Redis connection
    if docker exec vidfab-redis-standalone redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis 连接测试成功"
    else
        echo "⚠️  警告: Redis 服务运行中但无法连接"
    fi
else
    echo ""
    echo "⚠️  警告: 未检测到 Redis 服务运行"
    echo ""
    echo "应用需要 Redis 服务才能正常运行队列系统。"
    echo ""
    echo "请先启动 Redis 服务："
    echo "  ./scripts/redis-start.sh"
    echo ""
    read -p "是否继续启动应用? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

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
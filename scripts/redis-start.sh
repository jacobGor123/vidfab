#!/bin/bash

# VidFab AI Video Platform - Redis Start Script
# Author: VidFab Team
# Description: Start standalone Redis service as external service (like cloud Redis)
# Redis 作为独立的外部服务运行，通过宿主机端口访问，可供多个项目使用

set -e

echo "🔴 Starting VidFab Standalone Redis Service..."

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
LOG_FILE="logs/redis-start-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Check if Redis container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^vidfab-redis-standalone$"; then
    echo "🔍 检测到已存在的 Redis 容器..."

    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^vidfab-redis-standalone$"; then
        echo "✅ Redis 容器已经在运行中"

        # Test connection
        if docker exec vidfab-redis-standalone redis-cli ping 2>/dev/null | grep -q "PONG"; then
            echo "✅ Redis 连接测试成功"
        else
            echo "⚠️  警告: Redis 服务运行中但无法连接"
        fi

        echo ""
        echo "💡 如需重启 Redis，请先运行: ./scripts/redis-stop.sh"
        exit 0
    else
        echo "📦 启动已存在的 Redis 容器..."
        docker start vidfab-redis-standalone | tee -a "$LOG_FILE"
    fi
else
    echo "🚀 创建并启动新的 Redis 容器..."

    # Run Redis container with port mapping (no network needed)
    docker run -d \
      --name vidfab-redis-standalone \
      --restart unless-stopped \
      -p 6379:6379 \
      -v vidfab-redis-data:/data \
      redis:7-alpine redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru \
      2>&1 | tee -a "$LOG_FILE"
fi

# Wait for Redis to initialize
echo "⏳ 等待 Redis 初始化..."
sleep 3

# Test Redis connection
echo "🔍 测试 Redis 连接..."
if docker exec vidfab-redis-standalone redis-cli ping 2>&1 | grep -q "PONG"; then
    echo "✅ Redis 连接测试成功"
else
    echo "⚠️  警告: Redis 可能尚未完全启动"
fi

echo ""
echo "✅ VidFab Standalone Redis Service started successfully!"
echo "📋 Start log saved to: $LOG_FILE"
echo ""
echo "🔴 Redis 连接信息:"
echo "   - 容器名: vidfab-redis-standalone"
echo "   - 宿主机访问: localhost:6379"
echo "   - Docker 容器访问: host.docker.internal:6379"
echo "   - 数据卷: vidfab-redis-data"
echo ""
echo "📝 连接方式:"
echo "   本地应用:        redis://localhost:6379"
echo "   Docker 容器内:   redis://host.docker.internal:6379"
echo "   其他项目:        可直接连接 localhost:6379"
echo ""
echo "💡 管理命令:"
echo "   - './scripts/redis-stop.sh'              停止 Redis"
echo "   - 'docker exec -it vidfab-redis-standalone redis-cli'  连接 Redis CLI"
echo "   - 'docker logs vidfab-redis-standalone'  查看日志"
echo "   - 'docker stats vidfab-redis-standalone' 查看资源使用"

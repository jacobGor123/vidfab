#!/bin/bash

# VidFab AI Video Platform - Redis Start Script
# Author: VidFab Team
# Description: Start standalone Redis service with logging

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

# Check if network exists, create if not
echo "🔍 Checking Docker network..."
if ! docker network ls | grep -q vidfab-network; then
    echo "📡 Creating Docker network: vidfab-network"
    docker network create vidfab-network
    echo "✅ Network created successfully"
else
    echo "✅ Network vidfab-network already exists"
fi

# Start Redis service
echo "🚀 Starting Redis service..."
docker compose -f docker-compose-redis.yml up -d 2>&1 | tee "$LOG_FILE"

# Wait for Redis to initialize
echo "⏳ Waiting for Redis to initialize..."
sleep 3

# Check Redis status
echo "🔍 Checking Redis status..."
docker compose -f docker-compose-redis.yml ps 2>&1 | tee -a "$LOG_FILE"

# Test Redis connection
echo "🔍 Testing Redis connection..."
if docker exec vidfab-redis-standalone redis-cli ping 2>&1 | grep -q "PONG"; then
    echo "✅ Redis is responding correctly"
else
    echo "⚠️  Warning: Redis may not be ready yet"
fi

echo ""
echo "✅ VidFab Standalone Redis Service started successfully!"
echo "📋 Start log saved to: $LOG_FILE"
echo ""
echo "🔴 Redis connection info:"
echo "   - Container: vidfab-redis-standalone"
echo "   - Host: localhost (本地) / vidfab-redis-standalone (Docker)"
echo "   - Port: 6379"
echo "   - Network: vidfab-network"
echo ""
echo "💡 Useful commands:"
echo "   - './scripts/redis-stop.sh' - Stop Redis service"
echo "   - 'docker exec -it vidfab-redis-standalone redis-cli' - Connect to Redis CLI"
echo "   - 'docker logs vidfab-redis-standalone' - View Redis logs"
echo ""
echo "🎯 To start Redis Commander (GUI):"
echo "   docker compose -f docker-compose-redis.yml --profile debug up -d"
echo "   Then visit: http://localhost:8081 (admin/admin123)"

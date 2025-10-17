#!/bin/bash

# VidFab AI Video Platform - Redis Stop Script
# Author: VidFab Team
# Description: Stop standalone Redis service with logging

set -e

echo "🔴 Stopping VidFab Standalone Redis Service..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/redis-stop-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Check if Redis container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^vidfab-redis-standalone$"; then
    echo "⚠️  Redis 容器不存在，无需停止"
    exit 0
fi

# Stop Redis container
echo "⏹️  Stopping Redis container..."
docker stop vidfab-redis-standalone 2>&1 | tee "$LOG_FILE"

echo ""
echo "✅ VidFab Standalone Redis Service stopped successfully!"
echo "📋 Stop log saved to: $LOG_FILE"
echo ""
echo "💡 Redis 容器已停止但未删除"
echo "💡 数据保存在 Docker 卷: vidfab-redis-data"
echo "💡 重新启动: './scripts/redis-start.sh'"
echo "💡 完全删除: 'docker rm vidfab-redis-standalone'"

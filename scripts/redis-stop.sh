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

# Stop Redis service
echo "⏹️  Stopping Redis service..."
docker compose -f docker-compose-redis.yml down 2>&1 | tee "$LOG_FILE"

echo ""
echo "✅ VidFab Standalone Redis Service stopped successfully!"
echo "📋 Stop log saved to: $LOG_FILE"
echo ""
echo "💡 Data is preserved in Docker volume 'redis_data'"
echo "💡 To start again, run: './scripts/redis-start.sh'"

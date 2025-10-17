#!/bin/bash

# VidFab AI Video Platform - Docker Stop Script
# Author: VidFab Team
# Description: Stop the complete Docker environment

set -e

echo "🐳 Stopping VidFab Docker Environment..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/docker-stop-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Stop all services
echo "⏹️  Stopping all services..."
docker compose down 2>&1 | tee "$LOG_FILE"

echo "✅ VidFab Docker Environment stopped successfully!"
echo "📋 Stop log saved to: $LOG_FILE"
echo ""
echo "💡 To start again, run: './scripts/docker-start.sh'"
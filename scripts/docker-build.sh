#!/bin/bash

# VidFab AI Video Platform - Docker Build Script
# Author: VidFab Team
# Description: Build Docker image for the application

set -e

echo "🐳 Building VidFab Docker Image..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/docker-build-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Build Docker image with logging
echo "🔨 Building Docker image..."
docker compose build app 2>&1 | tee "$LOG_FILE"

echo "✅ Docker image built successfully!"
echo "📋 Build log saved to: $LOG_FILE"
echo ""
echo "💡 Next steps:"
echo "   - Run './scripts/docker-start.sh' to start the application"
echo "   - Run './scripts/docker-logs.sh' to view logs"
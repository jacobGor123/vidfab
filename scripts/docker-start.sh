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

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local file not found"
    echo "   Some environment variables might not be loaded"
    echo ""
fi

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
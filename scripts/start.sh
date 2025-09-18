#!/bin/bash

# VidFab AI Video Platform - Production Start Script
# Author: VidFab Team
# Description: Start production server with logging

set -e

echo "🚀 Starting VidFab Production Server..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/prod-server-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Check if build exists
if [ ! -d ".next" ]; then
    echo "❌ No build found. Running build first..."
    ./scripts/build.sh
fi

# Start production server with logging
echo "🌟 Starting production server..."
pnpm start 2>&1 | tee "$LOG_FILE"
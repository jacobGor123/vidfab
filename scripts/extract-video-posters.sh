#!/bin/bash

# VidFab AI Video Platform - Extract Video Posters Script
# Author: VidFab Team
# Description: 从视频中提取第一帧作为 poster 图片

set -e

echo "🎬 VidFab Video Poster Extraction Tool"
echo "========================================"

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/extract-posters-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo "Please run: ./scripts/install-ffmpeg.sh"
    exit 1
fi

echo "✅ ffmpeg is installed"
echo ""

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "📦 Installing tsx..."
    pnpm add -D tsx
fi

# Run the TypeScript script
echo "🚀 Running poster extraction..."
tsx scripts/extract-video-posters.ts 2>&1 | tee "$LOG_FILE"

echo ""
echo "✅ Script completed!"
echo "📋 Log saved to: $LOG_FILE"

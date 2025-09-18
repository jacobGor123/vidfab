#!/bin/bash

# VidFab AI Video Platform - Build Script
# Author: VidFab Team
# Description: Build production version with logging

set -e

echo "🏗️  Building VidFab for Production..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/build-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next

# Build project with logging
echo "🔨 Running production build..."
pnpm build 2>&1 | tee "$LOG_FILE"

echo "✅ Build completed successfully!"
echo "📋 Build log saved to: $LOG_FILE"
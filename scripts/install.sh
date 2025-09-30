#!/bin/bash

# VidFab AI Video Platform - Install Dependencies Script
# Author: VidFab Team
# Description: Install project dependencies with logging

set -e

echo "📦 Installing VidFab Dependencies..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/install-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Install dependencies with logging
echo "⬇️  Installing dependencies..."
pnpm install 2>&1 | tee "$LOG_FILE"

echo "✅ Dependencies installed successfully!"
echo "📋 Install log saved to: $LOG_FILE"
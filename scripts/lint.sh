#!/bin/bash

# VidFab AI Video Platform - Lint Script
# Author: VidFab Team
# Description: Run linting with logging

set -e

echo "🔍 Running VidFab Code Linting..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/lint-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Run linting with logging
pnpm lint 2>&1 | tee "$LOG_FILE"

# next lint 在未初始化 ESLint 配置时会进入交互式向导并返回非 0。
# 为避免 CI/本地脚本误判为成功，这里显式传播退出码。
exit ${PIPESTATUS[0]}

echo "✅ Linting completed!"
echo "📋 Lint log saved to: $LOG_FILE"
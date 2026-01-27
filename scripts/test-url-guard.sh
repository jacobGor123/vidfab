#!/bin/bash

# Video Agent - URL Guard unit test (no external deps)

set -e

echo "🧪 Running url-guard tests..."

mkdir -p logs
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/url-guard-test-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

npx tsx lib/services/video-agent/security/url-guard.test.ts 2>&1 | tee "$LOG_FILE"

echo "✅ url-guard tests completed"

#!/bin/bash

# VidFab - Typecheck script (no emit)

set -e

echo "🔎 Running TypeScript typecheck..."

mkdir -p logs
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/typecheck-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

pnpm -s tsc --noEmit 2>&1 | tee "$LOG_FILE"

echo "✅ Typecheck completed"

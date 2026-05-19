#!/bin/bash

# VidFab — Discover Migration Runner
# 给 discover_videos 表加 media_type + content_tab 字段
# 用法：./scripts/run-discover-migration.sh

set -e

# 加载本地 env
if [ -f ".env.local" ]; then
    set -a
    # shellcheck disable=SC1091
    source ".env.local"
    set +a
elif [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source ".env"
    set +a
fi

mkdir -p logs
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/discover-migration-$TIMESTAMP.log"

echo "🔧 Running discover migration..."
echo "📝 Log: $LOG_FILE"

pnpm -s tsx scripts/run-discover-migration.ts 2>&1 | tee "$LOG_FILE"

echo "✅ Migration done"

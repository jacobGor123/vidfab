#!/bin/bash

# 验证视频永久存储修复

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -f .env.local ]; then
  echo "📝 加载 .env.local 环境变量..."
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  echo "📝 加载 .env 环境变量..."
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 开始验证视频永久存储修复..."
npx tsx scripts/verify-video-storage-fix.ts

#!/bin/bash

# 查询 image to video API 的失败记录
# 分析 user_videos 表中的失败情况

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 进入项目根目录
cd "$PROJECT_ROOT"

# 加载环境变量
if [ -f .env.local ]; then
  echo "📝 加载 .env.local 环境变量..."
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  echo "📝 加载 .env 环境变量..."
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "⚠️  警告: 未找到环境变量文件"
fi

# 执行查询脚本
echo "🔍 开始查询 Image to Video API 失败记录..."
npx tsx scripts/query-image-to-video-failures.ts

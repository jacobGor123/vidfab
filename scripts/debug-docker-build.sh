#!/bin/bash
set -e

echo "=========================================="
echo "Docker 构建调试脚本"
echo "=========================================="
echo ""

# 构建镜像并保存 builder 阶段
echo "1. 构建 Docker 镜像（保留 builder 阶段）..."
docker build --target builder -t vidfab-builder . || {
  echo "❌ Builder 阶段构建失败！"
  exit 1
}

echo ""
echo "2. 检查 builder 阶段的 .next 目录结构..."
docker run --rm vidfab-builder ls -la /app/.next/ || {
  echo "❌ .next 目录不存在！"
  exit 1
}

echo ""
echo "3. 检查 .next/static 目录是否存在..."
docker run --rm vidfab-builder ls -la /app/.next/static/ || {
  echo "❌ .next/static 目录不存在！"
  echo ""
  echo "可能的原因："
  echo "  1. 构建失败但被错误容忍机制忽略了"
  echo "  2. next.config.mjs 配置问题"
  echo "  3. 环境变量缺失导致构建失败"
  exit 1
}

echo ""
echo "4. 检查 .next/static 目录内容..."
docker run --rm vidfab-builder find /app/.next/static -type f | head -20

echo ""
echo "✅ Builder 阶段检查通过！"
echo ""

echo "5. 构建完整镜像..."
docker build -t vidfab-debug . || {
  echo "❌ 完整镜像构建失败！"
  exit 1
}

echo ""
echo "6. 检查最终镜像的 .next/static 目录..."
docker run --rm vidfab-debug ls -la /app/.next/static/ || {
  echo "❌ 最终镜像中 .next/static 目录不存在！"
  exit 1
}

echo ""
echo "✅ 所有检查通过！Docker 镜像构建正常！"
echo "=========================================="

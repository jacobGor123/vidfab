#!/bin/bash
# 清理 Next.js 缓存脚本
# 用于解决博客图片缓存问题

set -e

echo "🧹 开始清理 Next.js 缓存..."

# 1. 清除 .next 构建缓存
if [ -d ".next" ]; then
  echo "  → 删除 .next 目录..."
  rm -rf .next
  echo "  ✓ .next 缓存已清除"
else
  echo "  ✓ .next 目录不存在，跳过"
fi

# 2. 清除 Node.js 模块缓存
echo "  → 清除 node_modules/.cache..."
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "  ✓ node_modules 缓存已清除"
else
  echo "  ✓ node_modules/.cache 不存在，跳过"
fi

# 3. 清除 pnpm 缓存（可选）
# echo "  → 清除 pnpm 缓存..."
# pnpm store prune
# echo "  ✓ pnpm 缓存已清除"

echo ""
echo "✅ 缓存清理完成!"
echo ""
echo "📋 下一步操作:"
echo "  1. 运行 pnpm dev 启动开发服务器"
echo "  2. 在浏览器中访问 http://localhost:3000/blog"
echo "  3. 使用 Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows) 强制刷新浏览器"
echo ""

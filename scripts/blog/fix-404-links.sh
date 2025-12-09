#!/bin/bash

# 批量修复文章中的 404 CTA 链接

cd "$(dirname "$0")/../.."

echo ""
echo "🔧 批量修复文章 CTA 链接"
echo "================================"
echo ""

if [ "$1" == "--execute" ] || [ "$1" == "-e" ]; then
  echo "⚠️  警告: 即将执行实际修改!"
  echo "   这将更新数据库中的文章内容"
  echo ""
  read -p "确认继续? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    echo "❌ 已取消"
    exit 0
  fi

  echo ""
  echo "✏️  执行修改模式..."
  tsx scripts/blog/fix-404-cta-links.ts --execute
else
  echo "🔍 预览模式 (不会实际修改数据)"
  echo "   如需执行修改，请运行: ./scripts/blog/fix-404-links.sh --execute"
  echo ""
  tsx scripts/blog/fix-404-cta-links.ts
fi

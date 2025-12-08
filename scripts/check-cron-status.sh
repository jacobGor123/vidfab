#!/bin/bash

# 检查 Cron Job 状态和日志

echo "🔍 检查 VidFab Cron Job 状态..."
echo ""

# 1. 检查最近的博客文章
echo "📝 最近生成的文章 (最近24小时):"
echo "-----------------------------------"
node scripts/check-blog-direct.mjs --hours 24
echo ""

# 2. 测试 Cron 端点 (本地)
echo "🧪 测试本地 Cron 端点:"
echo "-----------------------------------"
if [ "$1" == "--local" ]; then
  echo "正在调用本地端点..."
  curl -X GET http://localhost:3000/api/cron/generate-blog \
    -H "Content-Type: application/json" \
    | jq '.'
  echo ""
fi

# 3. 提示用户查看 Inngest Dashboard
echo "📊 查看详细执行日志:"
echo "-----------------------------------"
echo "1. Inngest Dashboard: https://www.inngest.com/dashboard"
echo "2. 查找函数: generate-blog-article"
echo "3. 查看最近的 Runs"
echo ""

# 4. 检查环境变量 (Vercel)
echo "🔑 需要检查的环境变量 (在 Vercel Dashboard):"
echo "-----------------------------------"
echo "✓ INNGEST_EVENT_KEY"
echo "✓ INNGEST_SIGNING_KEY"
echo "✓ ANTHROPIC_API_KEY"
echo "✓ SUPABASE_SERVICE_KEY"
echo ""

echo "✅ 检查完成！"
echo ""
echo "💡 提示:"
echo "  - Vercel Cron Logs 只显示 HTTP 200，不显示内部日志"
echo "  - 真正的执行日志在 Inngest Dashboard"
echo "  - 如果 Inngest 没有记录，检查环境变量"

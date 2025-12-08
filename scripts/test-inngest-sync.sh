#!/bin/bash

# 测试 Inngest 同步和事件发送

echo "🔍 测试 Inngest 配置..."
echo ""

# 获取环境变量 (从 .env.local)
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# 1. 检查环境变量
echo "1️⃣ 检查环境变量:"
echo "-----------------------------------"
if [ -z "$INNGEST_EVENT_KEY" ]; then
  echo "❌ INNGEST_EVENT_KEY 未设置"
else
  echo "✅ INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY:0:10}..."
fi

if [ -z "$INNGEST_SIGNING_KEY" ]; then
  echo "❌ INNGEST_SIGNING_KEY 未设置"
else
  echo "✅ INNGEST_SIGNING_KEY: ${INNGEST_SIGNING_KEY:0:15}..."
fi
echo ""

# 2. 测试本地 Inngest 端点
echo "2️⃣ 测试本地 Inngest 端点:"
echo "-----------------------------------"
if [ "$1" == "--local" ]; then
  echo "正在访问 http://localhost:3000/api/inngest ..."
  curl -s http://localhost:3000/api/inngest | head -20
  echo ""
fi

# 3. 测试生产环境 Inngest 端点
echo "3️⃣ 测试生产环境 Inngest 端点:"
echo "-----------------------------------"
if [ -n "$VERCEL_URL" ]; then
  PROD_URL="https://$VERCEL_URL"
elif [ "$2" != "" ]; then
  PROD_URL="$2"
else
  echo "请提供生产环境 URL: ./scripts/test-inngest-sync.sh --prod https://your-domain.vercel.app"
  PROD_URL=""
fi

if [ -n "$PROD_URL" ]; then
  echo "正在访问 $PROD_URL/api/inngest ..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/inngest")
  echo "HTTP 状态码: $HTTP_CODE"

  if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "405" ]; then
    echo "✅ Inngest 端点正常响应"
  else
    echo "❌ Inngest 端点响应异常"
  fi
fi
echo ""

# 4. 测试发送事件
echo "4️⃣ 测试发送 Inngest 事件:"
echo "-----------------------------------"
if [ "$1" == "--send-event" ]; then
  echo "正在发送 blog/generate.requested 事件..."

  curl -X POST "https://inn.gs/e/${INNGEST_EVENT_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "blog/generate.requested",
      "data": {
        "force": false,
        "test": true
      }
    }' | jq '.'

  echo ""
  echo "✅ 事件已发送！请在 Inngest Dashboard 检查 Runs"
else
  echo "要测试事件发送，请运行: ./scripts/test-inngest-sync.sh --send-event"
fi
echo ""

# 5. 提供诊断建议
echo "📝 诊断建议:"
echo "-----------------------------------"
echo "1. 在 Inngest Dashboard → Apps → 确认你的 app"
echo "2. 添加 Sync URL: https://your-domain.vercel.app/api/inngest"
echo "3. 点击 'Sync' 按钮强制同步"
echo "4. 检查 Functions 页面是否出现 'generate-blog-article'"
echo ""
echo "5. 如果函数已同步，手动触发测试:"
echo "   ./scripts/test-inngest-sync.sh --send-event"
echo ""

echo "✅ 测试完成！"

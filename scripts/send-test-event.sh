#!/bin/bash

# 手动发送测试事件到 Inngest

echo "🚀 手动发送测试事件到 Inngest..."
echo ""

# 从 Vercel 环境变量获取（你需要手动输入）
read -p "请输入你的 INNGEST_EVENT_KEY (从 Vercel 复制): " INNGEST_EVENT_KEY

if [ -z "$INNGEST_EVENT_KEY" ]; then
  echo "❌ 错误: INNGEST_EVENT_KEY 不能为空"
  exit 1
fi

echo ""
echo "正在发送事件到: https://inn.gs/e/${INNGEST_EVENT_KEY}"
echo ""

# 发送事件
response=$(curl -s -w "\n%{http_code}" -X POST "https://inn.gs/e/${INNGEST_EVENT_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "blog/generate.requested",
    "data": {
      "force": false,
      "test": true,
      "manualTrigger": true
    },
    "ts": '$(date +%s000)'
  }')

# 分离响应体和状态码
http_body=$(echo "$response" | head -n -1)
http_code=$(echo "$response" | tail -n 1)

echo "HTTP 状态码: $http_code"
echo ""
echo "响应内容:"
echo "$http_body" | jq '.' 2>/dev/null || echo "$http_body"
echo ""

if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
  echo "✅ 事件发送成功！"
  echo ""
  echo "📊 现在去 Inngest Dashboard 检查:"
  echo "   1. Events 页面 - 应该能看到事件"
  echo "   2. Runs 页面 - 应该能看到执行记录"
  echo ""
else
  echo "❌ 事件发送失败！"
  echo ""
  echo "可能的原因:"
  echo "  1. INNGEST_EVENT_KEY 不正确"
  echo "  2. 网络连接问题"
  echo "  3. Inngest 服务问题"
fi

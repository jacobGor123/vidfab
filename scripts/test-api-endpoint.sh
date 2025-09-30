#!/bin/bash

# 测试订阅状态API端点
# 这个脚本模拟前端调用API的行为

echo "🧪 测试订阅状态API端点..."

# 首先启动开发服务器（如果没有运行的话）
if ! lsof -ti:3000 > /dev/null; then
    echo "⚠️  开发服务器未运行，请先启动: npm run dev"
    exit 1
fi

echo "✅ 开发服务器正在运行"

# 测试API端点（无认证，应该返回401）
echo ""
echo "📋 1. 测试未认证访问（应该返回401）..."
curl -s -X GET "http://localhost:3000/api/subscription/status" \
    -H "Content-Type: application/json" | jq .

# 在实际场景中，我们需要模拟认证用户
# 但由于NextAuth的复杂性，我们通过直接查看日志来调试

echo ""
echo "🔍 2. 检查开发服务器日志以查看任何错误..."
echo "请在另一个终端窗口运行前端，然后登录用户并查看积分显示。"
echo "同时查看浏览器控制台和服务器日志。"

# 提供调试建议
echo ""
echo "🛠️  调试建议："
echo "1. 在浏览器中打开开发者工具"
echo "2. 登录一个有积分的用户 (如 ithermocraft@hotmail.com)"
echo "3. 查看网络请求标签页中 /api/subscription/status 的调用"
echo "4. 检查返回的JSON数据是否包含正确的积分数量"
echo "5. 查看控制台是否有JavaScript错误"

# 显示有积分的用户列表供测试
echo ""
echo "💰 测试用户列表（有积分）："
echo "- ithermocraft@hotmail.com (1300积分)"
echo "- jsdasww593@gmail.com (2910积分)"

echo ""
echo "✨ 如果API返回正确的积分数据，但前端不显示，问题可能在："
echo "1. useSubscription hook的状态管理"
echo "2. CreditsDisplay组件的渲染逻辑"
echo "3. 会话管理问题"
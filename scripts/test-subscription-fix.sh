#!/bin/bash

# VidFab订阅系统修复测试脚本
# 验证406错误是否已修复

echo "🧪 开始测试VidFab订阅系统修复..."

# 获取当前工作目录
VIDFAB_DIR="/Users/jacob/Desktop/vidfab"
cd "$VIDFAB_DIR"

echo "📂 当前目录: $(pwd)"

# 检查项目是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 错误：无法找到VidFab项目！"
    exit 1
fi

echo "✅ VidFab项目确认存在"

# 启动开发服务器（如果尚未运行）
echo "🚀 启动开发服务器..."

# 检查是否已有服务器在运行
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器已在运行"
else
    echo "🔄 启动新的开发服务器..."
    npm run dev &
    SERVER_PID=$!

    # 等待服务器启动
    echo "⏳ 等待服务器启动..."
    sleep 10

    # 检查服务器是否启动成功
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ 开发服务器启动成功"
    else
        echo "❌ 开发服务器启动失败"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
fi

echo ""
echo "🔍 测试要点："
echo "  1. 访问主页应该不出现406错误"
echo "  2. 用户登录后访问订阅状态API应该正常"
echo "  3. 控制台不应该出现subscription_plan相关的406错误"

echo ""
echo "📋 手动测试步骤："
echo "  1. 打开浏览器访问: http://localhost:3000"
echo "  2. 打开开发者工具，查看Network面板"
echo "  3. 登录用户账户"
echo "  4. 检查是否有以下API调用出现406错误："
echo "     - GET /api/subscription/status"
echo "     - 任何包含subscription_plan查询的请求"
echo "  5. 如果看到406错误，检查错误详情："
echo "     - 错误URL"
echo "     - 错误原因"
echo "     - Response详情"

echo ""
echo "🔧 如果仍有406错误，需要："
echo "  1. 在Supabase Dashboard执行schema修复脚本"
echo "  2. 检查数据库users表约束"
echo "  3. 确认subscription_plan字段值符合新约束"

echo ""
echo "📊 预期修复结果："
echo "  ✅ 不再出现406 (Not Acceptable)错误"
echo "  ✅ subscription_plan查询正常返回"
echo "  ✅ 订阅状态API正常工作"
echo "  ✅ 用户可以正常使用所有订阅功能"

echo ""
echo "🎯 现在请在浏览器中测试: http://localhost:3000"
echo "📊 检查开发者工具Network面板是否有406错误"

# 如果启动了新服务器，提供停止选项
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "⚠️  测试完成后，运行以下命令停止服务器:"
    echo "   kill $SERVER_PID"
fi

echo ""
echo "🔥 测试脚本完成！请手动验证修复效果。"
#!/bin/bash

# 设置图片存储 - VidFab AI Video Platform
# 包括Supabase Storage bucket和数据库表的创建

set -e

echo "🚀 开始设置图片存储系统..."

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 错误: 请设置SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY环境变量"
    echo ""
    echo "请在 .env.local 文件中设置:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    exit 1
fi

# 加载环境变量
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "📖 加载环境变量从 .env.local..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

echo "🔧 Supabase URL: $SUPABASE_URL"

# 执行SQL脚本
echo "📊 创建图片存储表和权限..."

# 使用curl调用Supabase REST API执行SQL
RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"sql\": \"$(cat "$SCRIPT_DIR/init-image-storage.sql" | sed 's/"/\\"/g' | tr '\n' ' ')\"}")

if [ $? -eq 0 ]; then
    echo "✅ 数据库设置完成"
else
    echo "❌ 数据库设置失败"
    echo "响应: $RESPONSE"
    # 尝试使用psql直接连接（如果可用）
    if command -v psql &> /dev/null; then
        echo "🔄 尝试使用psql直接执行..."

        # 从Supabase URL提取数据库连接信息
        DB_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')

        # 注意：这里需要您提供数据库连接字符串
        echo "请手动执行SQL脚本: $SCRIPT_DIR/init-image-storage.sql"
        echo "或者使用Supabase Dashboard的SQL编辑器"
    fi
fi

# 验证设置
echo "🔍 验证图片存储设置..."

# 检查bucket是否创建成功
BUCKET_CHECK=$(curl -s -X GET \
  "$SUPABASE_URL/storage/v1/bucket/user-images" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

if echo "$BUCKET_CHECK" | grep -q "user-images"; then
    echo "✅ user-images bucket 创建成功"
else
    echo "⚠️  请手动创建 user-images bucket:"
    echo "   1. 打开Supabase Dashboard"
    echo "   2. 进入Storage页面"
    echo "   3. 创建名为'user-images'的bucket"
    echo "   4. 设置为public bucket"
    echo "   5. 设置文件大小限制为10MB"
    echo "   6. 允许的MIME类型: image/jpeg, image/png, image/webp"
fi

# 检查表是否创建成功
TABLE_CHECK=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/user_images?select=id&limit=1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

if echo "$TABLE_CHECK" | grep -q "\[\]"; then
    echo "✅ user_images 表创建成功"
else
    echo "⚠️  user_images 表可能未创建，请检查SQL执行结果"
fi

echo ""
echo "🎉 图片存储系统设置完成！"
echo ""
echo "📝 接下来您可以:"
echo "   1. 使用ImageUploadWidget组件上传图片"
echo "   2. 在image-to-video功能中使用上传的图片"
echo "   3. 监控用户的存储使用情况"
echo ""
echo "🔗 相关文件:"
echo "   - 图片上传组件: components/image-upload/image-upload-widget.tsx"
echo "   - 图片处理工具: lib/image-processor.ts"
echo "   - 存储管理器: lib/storage.ts"
echo "   - 缓存管理器: lib/image-cache.ts"
echo ""
echo "💡 提示: 请确保在.env.local中正确配置了Supabase环境变量"
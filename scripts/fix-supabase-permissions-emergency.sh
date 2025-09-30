#!/bin/bash

# 紧急修复Supabase数据库权限问题
# 这个脚本立即修复用户无法访问积分的权限问题

echo "🚨 紧急修复Supabase权限问题..."

# 加载环境变量
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ 未找到 .env.local 文件"
    exit 1
fi

# 检查必要的环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 缺少必要的Supabase环境变量"
    exit 1
fi

echo "✅ Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "✅ 服务密钥已配置"

# 1. 检查当前RLS状态
echo ""
echo "📋 检查当前表的RLS状态..."

curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/check_table_rls_status" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "⚠️  无法调用RLS状态检查函数"

# 2. 紧急禁用users表的RLS（临时措施）
echo ""
echo "🔥 临时禁用users表的RLS以恢复数据访问..."

curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE users DISABLE ROW LEVEL SECURITY;"}' 2>/dev/null || echo "❌ 禁用RLS失败"

# 3. 验证服务角色权限
echo ""
echo "🔍 验证服务角色权限..."

# 测试基本SELECT权限
echo "测试users表SELECT权限..."
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=uuid,email,credits_remaining&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | jq . || echo "❌ SELECT权限测试失败"

# 4. 创建临时管理员政策（如果需要的话）
echo ""
echo "🛡️  创建临时管理员RLS政策..."

cat > /tmp/admin_policy.sql << 'EOF'
-- 为服务角色创建绕过RLS的政策
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage subscription_orders" ON subscription_orders;
CREATE POLICY "Service role can manage subscription_orders" ON subscription_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
EOF

# 执行管理员政策SQL
psql "$DATABASE_URL" -f /tmp/admin_policy.sql 2>/dev/null || {
    echo "⚠️  无法通过psql执行，尝试REST API..."

    # 通过REST API执行政策创建
    curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"query": "DROP POLICY IF EXISTS \"Service role can manage users\" ON users; CREATE POLICY \"Service role can manage users\" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);"}' || echo "❌ 创建用户管理政策失败"
}

# 5. 测试具体用户的积分查询
echo ""
echo "🧪 测试用户积分查询..."

# 查询一个用户的积分
USER_CREDITS=$(curl -s -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=uuid,email,credits_remaining&credits_remaining=gt.0&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

echo "用户积分查询结果:"
echo "$USER_CREDITS" | jq . || echo "$USER_CREDITS"

# 6. 重新启用users表的RLS（使用新的政策）
echo ""
echo "🔄 重新启用users表的RLS（现在有管理员政策）..."

curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE users ENABLE ROW LEVEL SECURITY;"}' 2>/dev/null || echo "❌ 重新启用RLS失败"

# 7. 最终验证
echo ""
echo "✅ 最终验证数据库访问..."

FINAL_TEST=$(curl -s -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=uuid,credits_remaining&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

if echo "$FINAL_TEST" | jq -e '.[0].credits_remaining' >/dev/null 2>&1; then
    echo "🎉 权限修复成功！可以正常访问用户积分数据。"
else
    echo "❌ 权限修复失败，仍无法访问用户数据。"
    echo "响应内容: $FINAL_TEST"
fi

# 清理临时文件
rm -f /tmp/admin_policy.sql

echo ""
echo "🔧 紧急权限修复脚本执行完成"
echo "📋 如果问题仍然存在，请检查Supabase控制台的RLS设置"
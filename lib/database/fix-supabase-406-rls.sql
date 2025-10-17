-- 修复Supabase 406错误 - RLS策略修复
-- 这个脚本解决服务端权限访问导致的406错误

-- 🔥 第一步：为服务端创建绕过RLS的策略
-- 删除现有的限制性RLS策略
DROP POLICY IF EXISTS users_policy ON users;

-- 🔥 第二步：创建新的RLS策略，允许服务端访问
-- 策略1: 认证用户可以访问自己的数据
CREATE POLICY users_authenticated_policy ON users
FOR ALL
USING (auth.uid()::text = uuid::text);

-- 策略2: Service Role可以访问所有数据（绕过RLS）
CREATE POLICY users_service_role_policy ON users
FOR ALL
USING (auth.role() = 'service_role');

-- 🔥 第三步：为其他表也创建类似的服务端访问策略
-- video_jobs表
DROP POLICY IF EXISTS video_jobs_policy ON video_jobs;
CREATE POLICY video_jobs_authenticated_policy ON video_jobs
FOR ALL
USING (auth.uid()::text = user_uuid::text);
CREATE POLICY video_jobs_service_role_policy ON video_jobs
FOR ALL
USING (auth.role() = 'service_role');

-- subscriptions表
DROP POLICY IF EXISTS subscriptions_policy ON subscriptions;
CREATE POLICY subscriptions_authenticated_policy ON subscriptions
FOR ALL
USING (auth.uid()::text = user_uuid::text);
CREATE POLICY subscriptions_service_role_policy ON subscriptions
FOR ALL
USING (auth.role() = 'service_role');

-- payments表
DROP POLICY IF EXISTS payments_policy ON payments;
CREATE POLICY payments_authenticated_policy ON payments
FOR ALL
USING (auth.uid()::text = user_uuid::text);
CREATE POLICY payments_service_role_policy ON payments
FOR ALL
USING (auth.role() = 'service_role');

-- 🔥 第四步：确保Service Role有正确的权限
-- 为Service Role授予必要权限
GRANT ALL ON users TO service_role;
GRANT ALL ON video_jobs TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON payments TO service_role;
GRANT ALL ON verification_codes TO service_role;

-- 验证策略设置
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('users', 'video_jobs', 'subscriptions', 'payments')
ORDER BY tablename, policyname;
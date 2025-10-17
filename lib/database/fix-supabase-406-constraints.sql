-- 修复Supabase 406错误 - 数据库约束修复
-- 这个脚本解决字段约束导致的406错误

-- 🔥 第一步：修复subscription_plan字段约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_plan_check
CHECK (subscription_plan IN ('free', 'basic', 'lite', 'pro', 'premium', 'enterprise'));

-- 🔥 第二步：修复subscription_status字段约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_status_check
CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'paused'));

-- 🔥 第三步：更新默认值
ALTER TABLE users ALTER COLUMN subscription_plan SET DEFAULT 'free';
ALTER TABLE users ALTER COLUMN subscription_status SET DEFAULT 'active';

-- 🔥 第四步：更新现有数据，避免约束冲突
UPDATE users SET subscription_plan = 'free' WHERE subscription_plan = 'basic' AND credits_remaining <= 50;
UPDATE users SET subscription_plan = 'premium' WHERE subscription_plan = 'enterprise';

-- 🔥 第五步：确保新用户默认积分充足
UPDATE users SET credits_remaining = 50 WHERE subscription_plan = 'free' AND credits_remaining < 50;

-- 验证修复结果
SELECT
    subscription_plan,
    subscription_status,
    COUNT(*) as user_count,
    AVG(credits_remaining) as avg_credits
FROM users
GROUP BY subscription_plan, subscription_status
ORDER BY subscription_plan;

-- 检查约束是否正确设置
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname LIKE '%subscription%';
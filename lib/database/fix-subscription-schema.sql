-- VidFab订阅系统Schema修复脚本
-- 修复subscription_plan字段约束冲突问题

-- 🔥 首先删除现有的约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

-- 🔥 更新subscription_plan字段约束，支持新的套餐类型
ALTER TABLE users ALTER COLUMN subscription_plan SET DEFAULT 'free';

-- 🔥 添加新的正确约束
ALTER TABLE users ADD CONSTRAINT users_subscription_plan_check
    CHECK (subscription_plan IN ('free', 'lite', 'pro', 'premium', 'basic', 'enterprise'));

-- 🔥 更新subscription_status字段约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_status_check
    CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'paused'));

-- 🔥 将所有existing 'basic' plan records 更新为 'free'
UPDATE users SET subscription_plan = 'free' WHERE subscription_plan = 'basic';

-- 🔥 将所有existing 'enterprise' plan records 更新为 'premium'
UPDATE users SET subscription_plan = 'premium' WHERE subscription_plan = 'enterprise';

-- 🔥 确保所有新用户默认获得免费计划的积分
UPDATE users SET credits_remaining = 50 WHERE subscription_plan = 'free' AND credits_remaining = 10;

-- 🔥 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- 🔥 验证修复结果
SELECT
    subscription_plan,
    subscription_status,
    COUNT(*) as user_count,
    AVG(credits_remaining) as avg_credits
FROM users
GROUP BY subscription_plan, subscription_status
ORDER BY subscription_plan;
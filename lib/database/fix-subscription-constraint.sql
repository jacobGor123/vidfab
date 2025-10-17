-- 修复订阅套餐约束问题
-- 紧急修复：将数据库约束改为支持实际使用的套餐值

-- 🔥 第一步：删除现有的约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

-- 🔥 第二步：添加新的约束，支持我们实际使用的值
ALTER TABLE users ADD CONSTRAINT users_subscription_plan_check
CHECK (subscription_plan IN ('free', 'basic', 'lite', 'pro', 'premium', 'enterprise'));

-- 🔥 第三步：更新默认值为 'free'（这样新用户注册不会出错）
ALTER TABLE users ALTER COLUMN subscription_plan SET DEFAULT 'free';

-- 🔥 第四步：如果有现有用户数据需要修正，可以运行以下语句
-- UPDATE users SET subscription_plan = 'free' WHERE subscription_plan = 'basic' AND credits_remaining <= 50;

-- 验证约束是否正确设置
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_subscription_plan_check';
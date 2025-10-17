-- 修复subscription_plan枚举约束问题
-- 确保数据库支持代码中实际使用的套餐类型

-- 首先检查当前的约束
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname LIKE '%subscription_plan%';

-- 删除现有的CHECK约束（如果存在）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS subscription_plan_check;

-- 添加支持实际使用套餐类型的新约束
ALTER TABLE users ADD CONSTRAINT users_subscription_plan_check
CHECK (subscription_plan IN ('free', 'lite', 'pro', 'premium'));

-- 更新现有数据中的不兼容值
UPDATE users
SET subscription_plan = CASE
  WHEN subscription_plan = 'basic' THEN 'free'
  WHEN subscription_plan = 'enterprise' THEN 'premium'
  ELSE subscription_plan
END
WHERE subscription_plan IN ('basic', 'enterprise');

-- 确保所有用户都有默认套餐
UPDATE users
SET subscription_plan = 'free'
WHERE subscription_plan IS NULL;

-- 验证修复结果
SELECT subscription_plan, COUNT(*)
FROM users
GROUP BY subscription_plan;
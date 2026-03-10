-- ============================================================
-- 操作一：加积分
-- 把 user@example.com 和 500 换成实际邮箱和积分数
-- ============================================================
UPDATE users
SET
    credits_remaining    = credits_remaining + 500,
    total_credits_earned = total_credits_earned + 500,
    updated_at           = NOW()
WHERE email = 'user@example.com';


-- ============================================================
-- 操作二：开通订阅权限
-- subscription_plan: 'pro' 或 'premium'
-- credits_remaining: pro=1500 / premium=3500（会叠加到现有积分上）
-- ============================================================
UPDATE users
SET
    subscription_plan    = 'pro',
    subscription_status  = 'active',
    credits_remaining    = credits_remaining + 1500,
    total_credits_earned = total_credits_earned + 1500,
    credits_last_reset_date = NOW(),
    updated_at           = NOW()
WHERE email = 'user@example.com';


-- ============================================================
-- 操作三：取消订阅（降回 free）
-- ============================================================
UPDATE users
SET
    subscription_plan   = 'free',
    subscription_status = 'inactive',
    updated_at          = NOW()
WHERE email = 'user@example.com';

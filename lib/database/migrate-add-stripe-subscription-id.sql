-- 迁移脚本：添加 stripe_subscription_id 字段到 subscription_orders 表
-- 创建时间: 2025-01-20
-- 目的：修复 webhook 订单状态更新功能，支持记录 Stripe 订阅 ID

-- 1. 检查字段是否已存在（安全检查）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscription_orders'
        AND column_name = 'stripe_subscription_id'
    ) THEN
        -- 2. 添加 stripe_subscription_id 字段
        ALTER TABLE subscription_orders
        ADD COLUMN stripe_subscription_id VARCHAR(255);

        RAISE NOTICE 'Column stripe_subscription_id added successfully';
    ELSE
        RAISE NOTICE 'Column stripe_subscription_id already exists, skipping';
    END IF;
END $$;

-- 3. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_subscription_id
ON subscription_orders(stripe_subscription_id);

-- 4. 验证字段是否添加成功
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_orders'
AND column_name = 'stripe_subscription_id';

-- 5. 显示表结构（可选）
\d subscription_orders;

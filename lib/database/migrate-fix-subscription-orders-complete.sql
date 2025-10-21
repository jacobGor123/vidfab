-- 完整迁移脚本：修复 subscription_orders 表的所有缺失字段
-- 创建时间: 2025-01-20
-- 目的：确保 subscription_orders 表包含所有必需的字段

BEGIN;

-- 1. 添加 stripe_subscription_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN stripe_subscription_id VARCHAR(255);
        RAISE NOTICE '✅ Added column: stripe_subscription_id';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: stripe_subscription_id';
    END IF;
END $$;

-- 2. 添加 completed_at 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN completed_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added column: completed_at';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: completed_at';
    END IF;
END $$;

-- 3. 添加 stripe_checkout_session_id 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'stripe_checkout_session_id'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN stripe_checkout_session_id VARCHAR(255);
        RAISE NOTICE '✅ Added column: stripe_checkout_session_id';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: stripe_checkout_session_id';
    END IF;
END $$;

-- 4. 添加 stripe_customer_id 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN stripe_customer_id VARCHAR(255);
        RAISE NOTICE '✅ Added column: stripe_customer_id';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: stripe_customer_id';
    END IF;
END $$;

-- 5. 添加 stripe_payment_intent_id 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN stripe_payment_intent_id VARCHAR(255);
        RAISE NOTICE '✅ Added column: stripe_payment_intent_id';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: stripe_payment_intent_id';
    END IF;
END $$;

-- 6. 添加 period_start 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'period_start'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN period_start TIMESTAMPTZ;
        RAISE NOTICE '✅ Added column: period_start';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: period_start';
    END IF;
END $$;

-- 7. 添加 period_end 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'period_end'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN period_end TIMESTAMPTZ;
        RAISE NOTICE '✅ Added column: period_end';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: period_end';
    END IF;
END $$;

-- 8. 添加 metadata 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added column: metadata';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: metadata';
    END IF;
END $$;

-- 9. 添加 notes 字段（如果缺失）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'notes'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added column: notes';
    ELSE
        RAISE NOTICE '⏭️  Column already exists: notes';
    END IF;
END $$;

-- 10. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_subscription_id
    ON subscription_orders(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_checkout_session_id
    ON subscription_orders(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_customer_id
    ON subscription_orders(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_completed_at
    ON subscription_orders(completed_at);

RAISE NOTICE '✅ Indexes created/verified';

COMMIT;

-- 11. 验证所有字段
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'subscription_orders'
ORDER BY ordinal_position;

-- 12. 显示表结构摘要
SELECT
    COUNT(*) as total_columns,
    COUNT(CASE WHEN column_name LIKE 'stripe_%' THEN 1 END) as stripe_columns,
    COUNT(CASE WHEN data_type = 'timestamp with time zone' THEN 1 END) as timestamp_columns
FROM information_schema.columns
WHERE table_name = 'subscription_orders';

-- 为 subscription_orders 表添加 updated_at 字段
-- 请在 Supabase SQL Editor 中执行此脚本

-- 1. 添加 updated_at 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_orders' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE subscription_orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'updated_at 字段已添加';
    ELSE
        RAISE NOTICE 'updated_at 字段已存在';
    END IF;
END $$;

-- 2. 为现有记录设置 updated_at = created_at
UPDATE subscription_orders
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 3. 验证结果
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'subscription_orders'
    AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;

-- 4. 查看示例数据
SELECT id, created_at, updated_at, status
FROM subscription_orders
LIMIT 5;

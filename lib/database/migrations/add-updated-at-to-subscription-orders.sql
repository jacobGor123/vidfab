-- 为 subscription_orders 表添加 updated_at 字段
-- Migration: add-updated-at-to-subscription-orders

-- 添加 updated_at 字段
ALTER TABLE subscription_orders
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 为现有记录设置 updated_at 为 created_at
UPDATE subscription_orders
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 创建或替换更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_subscription_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_subscription_orders_updated_at ON subscription_orders;

-- 创建触发器
CREATE TRIGGER trigger_update_subscription_orders_updated_at
    BEFORE UPDATE ON subscription_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_orders_updated_at();

-- 验证
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscription_orders' AND column_name = 'updated_at';

-- VidFab订阅系统数据库扩展Schema
-- 在现有database-schema.sql基础上增加订阅系统支持

-- 扩展现有users表，添加订阅相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS concurrent_jobs_running INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_last_reset_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_spent INTEGER DEFAULT 0;

-- 订阅订单表 (基于现有payments表的扩展概念)
CREATE TABLE IF NOT EXISTS subscription_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,

    -- 订单类型和计划信息
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('subscription', 'upgrade', 'downgrade', 'renewal')),
    plan_id VARCHAR(20) NOT NULL CHECK (plan_id IN ('free', 'lite', 'pro', 'premium')),
    billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),

    -- 价格信息
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    credits_included INTEGER NOT NULL DEFAULT 0,

    -- 订单状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- Stripe集成字段
    stripe_payment_intent_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),

    -- 订阅周期信息
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- 元数据和备注
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    CONSTRAINT positive_amount CHECK (amount_cents >= 0),
    CONSTRAINT positive_credits CHECK (credits_included >= 0)
);

-- Credits交易记录表
CREATE TABLE IF NOT EXISTS credits_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    order_id UUID REFERENCES subscription_orders(id),

    -- 交易类型和数量
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'refunded', 'expired', 'bonus')),
    credits_amount INTEGER NOT NULL, -- 正数为获得，负数为消费
    balance_before INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL DEFAULT 0,

    -- 消费详情（用于spent类型）
    consumed_by VARCHAR(50), -- 'video_generation', 'veo3_fast', 'video_effects'
    video_job_id UUID, -- 关联到video_jobs表
    model_used VARCHAR(50),
    resolution VARCHAR(10),
    duration VARCHAR(10),

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 元数据
    metadata JSONB DEFAULT '{}',
    description TEXT,

    CONSTRAINT valid_credits_amount CHECK (credits_amount != 0)
);

-- Credits预扣记录表（解决并发问题）
CREATE TABLE IF NOT EXISTS credits_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    video_job_id UUID REFERENCES video_jobs(id),

    -- 预扣信息
    reserved_credits INTEGER NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    estimated_cost INTEGER NOT NULL,

    -- 状态管理
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),

    -- 时间管理
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    consumed_at TIMESTAMPTZ,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    CONSTRAINT positive_reserved_credits CHECK (reserved_credits > 0)
);

-- 用户套餐变更历史表
CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,

    -- 变更信息
    from_plan VARCHAR(20),
    to_plan VARCHAR(20) NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'new_subscription', 'cancellation', 'renewal')),

    -- 相关订单
    order_id UUID REFERENCES subscription_orders(id),

    -- Credits处理
    credits_before INTEGER DEFAULT 0,
    credits_after INTEGER DEFAULT 0,
    credits_adjustment INTEGER DEFAULT 0,

    -- 时间戳
    effective_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 元数据
    reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_subscription_orders_user_uuid ON subscription_orders(user_uuid);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON subscription_orders(status);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_subscription_id ON subscription_orders(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_created_at ON subscription_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_uuid ON credits_transactions(user_uuid);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_type ON credits_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON credits_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_video_job_id ON credits_transactions(video_job_id);

CREATE INDEX IF NOT EXISTS idx_credits_reservations_user_uuid ON credits_reservations(user_uuid);
CREATE INDEX IF NOT EXISTS idx_credits_reservations_status ON credits_reservations(status);
CREATE INDEX IF NOT EXISTS idx_credits_reservations_expires_at ON credits_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_credits_reservations_video_job_id ON credits_reservations(video_job_id);

CREATE INDEX IF NOT EXISTS idx_subscription_changes_user_uuid ON subscription_changes(user_uuid);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_effective_date ON subscription_changes(effective_date);

-- 创建触发器自动更新timestamps
CREATE TRIGGER update_subscription_orders_updated_at
    BEFORE UPDATE ON subscription_orders
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 启用行级安全策略
ALTER TABLE subscription_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY subscription_orders_policy ON subscription_orders FOR ALL USING (auth.uid()::text = user_uuid::text);
CREATE POLICY credits_transactions_policy ON credits_transactions FOR ALL USING (auth.uid()::text = user_uuid::text);
CREATE POLICY credits_reservations_policy ON credits_reservations FOR ALL USING (auth.uid()::text = user_uuid::text);
CREATE POLICY subscription_changes_policy ON subscription_changes FOR ALL USING (auth.uid()::text = user_uuid::text);

-- 授权权限
GRANT ALL ON subscription_orders TO authenticated;
GRANT ALL ON credits_transactions TO authenticated;
GRANT ALL ON credits_reservations TO authenticated;
GRANT ALL ON subscription_changes TO authenticated;

-- 创建清理过期预扣记录的函数
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    -- 释放过期的预扣记录
    UPDATE credits_reservations
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < NOW();

    -- 删除超过24小时的过期记录
    DELETE FROM credits_reservations
    WHERE status = 'expired' AND expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 创建用户积分重置函数（月度重置）
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    plan_credits INTEGER;
BEGIN
    -- 遍历所有需要重置积分的用户
    FOR user_record IN
        SELECT uuid, subscription_plan, credits_last_reset_date
        FROM users
        WHERE credits_last_reset_date < DATE_TRUNC('month', NOW())
        AND subscription_plan IS NOT NULL
    LOOP
        -- 根据套餐获取应发放的积分数量
        CASE user_record.subscription_plan
            WHEN 'free' THEN plan_credits := 50;
            WHEN 'lite' THEN plan_credits := 300;
            WHEN 'pro' THEN plan_credits := 1000;
            WHEN 'premium' THEN plan_credits := 2000;
            ELSE plan_credits := 50;
        END CASE;

        -- 更新用户积分和重置日期
        UPDATE users
        SET
            credits_remaining = plan_credits,
            credits_last_reset_date = NOW(),
            total_credits_earned = total_credits_earned + plan_credits,
            updated_at = NOW()
        WHERE uuid = user_record.uuid;

        -- 记录积分发放交易
        INSERT INTO credits_transactions (
            user_uuid, transaction_type, credits_amount,
            balance_after, description, created_at
        ) VALUES (
            user_record.uuid, 'earned', plan_credits,
            plan_credits, 'Monthly credits reset for ' || user_record.subscription_plan || ' plan',
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建用户积分余额更新函数
CREATE OR REPLACE FUNCTION update_user_credits_balance(
    p_user_uuid UUID,
    p_credits_change INTEGER,
    p_transaction_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- 获取当前余额
    SELECT credits_remaining INTO current_balance
    FROM users
    WHERE uuid = p_user_uuid;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    -- 计算新余额
    new_balance := current_balance + p_credits_change;

    -- 确保余额不为负数
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', current_balance, ABS(p_credits_change);
    END IF;

    -- 更新用户余额
    UPDATE users
    SET
        credits_remaining = new_balance,
        total_credits_spent = CASE
            WHEN p_credits_change < 0 THEN total_credits_spent + ABS(p_credits_change)
            ELSE total_credits_spent
        END,
        total_credits_earned = CASE
            WHEN p_credits_change > 0 THEN total_credits_earned + p_credits_change
            ELSE total_credits_earned
        END,
        updated_at = NOW()
    WHERE uuid = p_user_uuid;

    -- 记录交易
    INSERT INTO credits_transactions (
        user_uuid, transaction_type, credits_amount,
        balance_before, balance_after, description, metadata
    ) VALUES (
        p_user_uuid, p_transaction_type, p_credits_change,
        current_balance, new_balance, p_description, p_metadata
    );

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;
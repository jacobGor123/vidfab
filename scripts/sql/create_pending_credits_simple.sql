-- 创建 pending_credits 表（用于未注册用户的积分预分配）
CREATE TABLE IF NOT EXISTS pending_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
    source VARCHAR(100) NOT NULL,
    description TEXT,
    assigned_by VARCHAR(255),
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by_uuid UUID REFERENCES users(uuid),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_pending_credits_email ON pending_credits(email);
CREATE INDEX idx_pending_credits_claimed ON pending_credits(is_claimed);

-- 验证
SELECT 'pending_credits 表创建成功' AS status;

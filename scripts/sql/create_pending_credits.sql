-- ===================================
-- 创建 pending_credits 表
-- 用于存储待领取的积分（支持未注册用户）
-- ===================================
-- 用途: 员工福利、推荐奖励、促销活动等场景
-- 创建日期: 2025-11-13
-- ===================================

BEGIN;

-- 创建表
CREATE TABLE IF NOT EXISTS pending_credits (
    -- 主键
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 待领取用户信息
    email VARCHAR(255) NOT NULL,
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),

    -- 来源追踪
    source VARCHAR(100) NOT NULL,  -- 例如: '员工福利2025Q1', '推荐奖励', '促销活动'
    description TEXT,              -- 详细说明
    assigned_by VARCHAR(255),      -- 操作人员（邮箱或ID）

    -- 领取状态
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by_uuid UUID REFERENCES users(uuid),
    claimed_at TIMESTAMPTZ,

    -- 过期控制（可选）
    expires_at TIMESTAMPTZ,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 约束：邮箱格式验证
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_pending_credits_email ON pending_credits(email);
CREATE INDEX IF NOT EXISTS idx_pending_credits_claimed ON pending_credits(is_claimed);
CREATE INDEX IF NOT EXISTS idx_pending_credits_expires ON pending_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_credits_source ON pending_credits(source);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_pending_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pending_credits_updated_at ON pending_credits;
CREATE TRIGGER trigger_pending_credits_updated_at
    BEFORE UPDATE ON pending_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_credits_updated_at();

COMMIT;

-- 验证
SELECT
    '✅ pending_credits 表创建成功' AS status,
    COUNT(*) AS row_count
FROM pending_credits;

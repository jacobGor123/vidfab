-- ================================================================
-- 添加 users 表缺失的扩展字段
-- ================================================================
-- 用途：为 users 表添加订阅系统所需的扩展字段
-- 说明：这些字段来自 subscription-schema.sql,用于跟踪用户的积分统计
-- ================================================================

-- 添加并发任务数量跟踪
ALTER TABLE users ADD COLUMN IF NOT EXISTS concurrent_jobs_running INTEGER DEFAULT 0;

-- 添加积分重置日期
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_last_reset_date TIMESTAMPTZ DEFAULT NOW();

-- 添加总获得积分统计
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_earned INTEGER DEFAULT 0;

-- 添加总消费积分统计
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_spent INTEGER DEFAULT 0;

-- 为新字段创建索引（可选，提升查询性能）
CREATE INDEX IF NOT EXISTS idx_users_credits_last_reset ON users(credits_last_reset_date);

-- 显示结果
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
    'concurrent_jobs_running',
    'credits_last_reset_date',
    'total_credits_earned',
    'total_credits_spent'
)
ORDER BY column_name;

-- 提示信息
DO $$
BEGIN
    RAISE NOTICE '✅ 用户表扩展字段添加完成!';
    RAISE NOTICE '新增字段:';
    RAISE NOTICE '  - concurrent_jobs_running (并发任务数量)';
    RAISE NOTICE '  - credits_last_reset_date (积分重置日期)';
    RAISE NOTICE '  - total_credits_earned (总获得积分)';
    RAISE NOTICE '  - total_credits_spent (总消费积分)';
    RAISE NOTICE '';
    RAISE NOTICE '现在可以运行完整版的管理脚本了!';
END $$;

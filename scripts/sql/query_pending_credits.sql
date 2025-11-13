-- ===================================
-- 查询 pending_credits 统计信息
-- ===================================
-- 用途: 监控积分分配状态、查看领取进度
-- ===================================

-- ===================================
-- 1. 查看所有待领取积分
-- ===================================
SELECT
    email,
    credits_amount,
    source,
    description,
    assigned_by,
    created_at,
    expires_at,
    CASE
        WHEN expires_at IS NULL THEN '永久有效'
        WHEN expires_at > NOW() THEN '有效'
        ELSE '已过期'
    END AS status
FROM pending_credits
WHERE is_claimed = FALSE
ORDER BY created_at DESC;

-- ===================================
-- 2. 查看已领取积分
-- ===================================
SELECT
    pc.email,
    pc.credits_amount,
    pc.source,
    pc.claimed_at,
    u.nickname AS claimed_by_nickname,
    u.email AS claimed_by_email,
    (pc.claimed_at - pc.created_at) AS claim_duration
FROM pending_credits pc
LEFT JOIN users u ON pc.claimed_by_uuid = u.uuid
WHERE pc.is_claimed = TRUE
ORDER BY pc.claimed_at DESC;

-- ===================================
-- 3. 统计汇总（按来源分组）
-- ===================================
SELECT
    source,
    COUNT(*) AS total_count,
    SUM(credits_amount) AS total_credits,
    COUNT(*) FILTER (WHERE is_claimed = TRUE) AS claimed_count,
    COUNT(*) FILTER (WHERE is_claimed = FALSE) AS pending_count,
    ROUND(
        COUNT(*) FILTER (WHERE is_claimed = TRUE)::NUMERIC / COUNT(*) * 100,
        2
    ) AS claim_rate_percent
FROM pending_credits
GROUP BY source
ORDER BY total_credits DESC;

-- ===================================
-- 4. 检查某个员工的积分
-- ===================================
-- 使用方式: 替换 'employee@company.com' 为实际邮箱
SELECT
    id,
    email,
    credits_amount,
    source,
    description,
    is_claimed,
    claimed_at,
    created_at,
    CASE
        WHEN is_claimed THEN '✅ 已领取'
        WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN '❌ 已过期'
        ELSE '⏳ 待领取'
    END AS status
FROM pending_credits
WHERE email = 'employee@company.com'
ORDER BY created_at DESC;

-- ===================================
-- 5. 查看即将过期的积分（30天内）
-- ===================================
SELECT
    email,
    credits_amount,
    source,
    expires_at,
    (expires_at - NOW()) AS time_remaining,
    EXTRACT(DAY FROM (expires_at - NOW())) AS days_remaining
FROM pending_credits
WHERE is_claimed = FALSE
  AND expires_at IS NOT NULL
  AND expires_at > NOW()
  AND expires_at < NOW() + INTERVAL '30 days'
ORDER BY expires_at ASC;

-- ===================================
-- 6. 查看已过期但未领取的积分
-- ===================================
SELECT
    email,
    credits_amount,
    source,
    created_at,
    expires_at,
    (NOW() - expires_at) AS expired_duration
FROM pending_credits
WHERE is_claimed = FALSE
  AND expires_at IS NOT NULL
  AND expires_at < NOW()
ORDER BY expires_at DESC;

-- ===================================
-- 7. 整体汇总统计
-- ===================================
SELECT
    COUNT(*) AS total_records,
    COUNT(DISTINCT email) AS unique_emails,
    SUM(credits_amount) AS total_credits,
    SUM(CASE WHEN is_claimed = TRUE THEN credits_amount ELSE 0 END) AS claimed_credits,
    SUM(CASE WHEN is_claimed = FALSE THEN credits_amount ELSE 0 END) AS pending_credits,
    COUNT(*) FILTER (WHERE is_claimed = TRUE) AS claimed_count,
    COUNT(*) FILTER (WHERE is_claimed = FALSE) AS pending_count,
    ROUND(
        SUM(CASE WHEN is_claimed = TRUE THEN credits_amount ELSE 0 END)::NUMERIC /
        NULLIF(SUM(credits_amount), 0) * 100,
        2
    ) AS claim_rate_percent
FROM pending_credits;

-- ===================================
-- 批量插入员工积分模板
-- ===================================
-- 注意: 这是一个模板文件，实际使用时由 TypeScript 脚本自动生成
-- 或者手动复制此模板，替换邮箱列表后执行
-- ===================================

BEGIN;

-- 批量插入员工积分
-- 格式: (邮箱, 积分数量, 来源, 描述, 操作人)
INSERT INTO pending_credits (email, credits_amount, source, description, assigned_by)
VALUES
    ('employee1@company.com', 100, '员工福利2025Q1', '公司内部员工积分赠送', 'admin@company.com'),
    ('employee2@company.com', 100, '员工福利2025Q1', '公司内部员工积分赠送', 'admin@company.com'),
    ('employee3@company.com', 100, '员工福利2025Q1', '公司内部员工积分赠送', 'admin@company.com'),
    ('employee4@company.com', 100, '员工福利2025Q1', '公司内部员工积分赠送', 'admin@company.com'),
    ('employee5@company.com', 100, '员工福利2025Q1', '公司内部员工积分赠送', 'admin@company.com')
    -- ⚠️ 添加更多员工时，注意最后一行不要加逗号
ON CONFLICT DO NOTHING; -- 如果邮箱已存在相同来源的记录，跳过

COMMIT;

-- ===================================
-- 验证插入结果
-- ===================================
SELECT
    COUNT(*) AS total_assigned,
    SUM(credits_amount) AS total_credits,
    COUNT(DISTINCT email) AS unique_employees
FROM pending_credits
WHERE source = '员工福利2025Q1' AND is_claimed = FALSE;

-- 查看详细列表
SELECT
    email,
    credits_amount,
    created_at
FROM pending_credits
WHERE source = '员工福利2025Q1' AND is_claimed = FALSE
ORDER BY created_at DESC;

-- ================================================================
-- VidFab 管理员工具 - 修改用户订阅套餐 (专用版)
-- ================================================================
-- 用途：仅修改指定用户的订阅套餐和状态
-- 使用方法：修改配置变量后在 Supabase 执行
-- ================================================================

DO $$
DECLARE
    -- ⚙️ 配置区
    v_target_email VARCHAR(255) := 'danielle.wen1994@gmail.com';  -- 目标邮箱
    v_new_plan VARCHAR(20) := 'pro';  -- 新套餐: 'basic', 'pro', 'enterprise'
    v_new_status VARCHAR(20) := 'active';  -- 新状态: 'active', 'inactive', 'cancelled', 'past_due'

    -- 内部变量
    v_user_uuid UUID;
    v_old_plan VARCHAR(20);
    v_old_status VARCHAR(20);
    v_current_credits INTEGER;

BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE '📦 修改用户订阅套餐';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '目标邮箱: %', v_target_email;
    RAISE NOTICE '目标套餐: % (%)', v_new_plan, v_new_status;
    RAISE NOTICE '';

    -- 查找用户
    SELECT uuid, subscription_plan, subscription_status, credits_remaining
    INTO v_user_uuid, v_old_plan, v_old_status, v_current_credits
    FROM users
    WHERE email = v_target_email;

    -- 检查用户是否存在
    IF v_user_uuid IS NULL THEN
        RAISE EXCEPTION '❌ 未找到用户: %', v_target_email;
    END IF;

    RAISE NOTICE '✅ 找到用户';
    RAISE NOTICE '   UUID: %', v_user_uuid;
    RAISE NOTICE '   当前套餐: % (%)', v_old_plan, v_old_status;
    RAISE NOTICE '   当前积分: %', v_current_credits;
    RAISE NOTICE '';

    -- 验证套餐类型
    IF v_new_plan NOT IN ('basic', 'pro', 'enterprise') THEN
        RAISE EXCEPTION '❌ 无效的套餐: "%". 有效值: basic, pro, enterprise', v_new_plan;
    END IF;

    -- 验证状态
    IF v_new_status NOT IN ('active', 'inactive', 'cancelled', 'past_due') THEN
        RAISE EXCEPTION '❌ 无效的状态: "%". 有效值: active, inactive, cancelled, past_due', v_new_status;
    END IF;

    -- 更新套餐
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE '正在更新套餐...';

    UPDATE users
    SET
        subscription_plan = v_new_plan,
        subscription_status = v_new_status,
        updated_at = NOW()
    WHERE uuid = v_user_uuid;

    RAISE NOTICE '✅ 套餐更新成功!';
    RAISE NOTICE '   原套餐: % (%)', v_old_plan, v_old_status;
    RAISE NOTICE '   新套餐: % (%)', v_new_plan, v_new_status;
    RAISE NOTICE '';

    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ 操作完成!';
    RAISE NOTICE '================================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================================';
        RAISE NOTICE '❌ 执行失败!';
        RAISE NOTICE 'SQL错误: %', SQLERRM;
        RAISE NOTICE '================================================================';
        RAISE;
END $$;

-- 查询更新后的结果
SELECT
    email AS "邮箱",
    nickname AS "昵称",
    credits_remaining AS "当前积分",
    subscription_plan AS "订阅套餐",
    subscription_status AS "订阅状态",
    created_at AS "注册时间",
    updated_at AS "最后更新"
FROM users
WHERE email = 'danielle.wen1994@gmail.com'
LIMIT 1;

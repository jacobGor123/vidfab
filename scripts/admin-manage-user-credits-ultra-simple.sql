-- ================================================================
-- VidFab 管理员工具 - 用户积分和套餐管理 (超级简化版)
-- ================================================================
-- 用途：为指定邮箱的用户增加积分或修改订阅套餐
-- 特点：仅操作 users 表,不依赖任何扩展表,保证 100% 兼容
-- 使用方法：
--   1. 修改下方配置变量
--   2. 在 Supabase SQL Editor 中执行
-- ================================================================

-- ============================================================
-- 🎯 配置区 - 请修改以下变量
-- ============================================================

DO $$
DECLARE
    -- ⚙️ 目标用户
    v_target_email VARCHAR(255) := 'danielle.wen1994@gmail.com';

    -- ⚙️ 积分操作
    v_credits_to_add INTEGER := 10000;  -- 增加的积分数量 (正数=增加, 负数=扣减)

    -- ⚙️ 套餐操作 (可选)
    v_update_plan BOOLEAN := FALSE;  -- 是否修改套餐 (TRUE/FALSE)
    v_new_plan VARCHAR(20) := 'pro';  -- 套餐: 'basic', 'pro', 'enterprise'
    v_new_status VARCHAR(20) := 'active';  -- 状态: 'active', 'inactive', 'cancelled', 'past_due'

    -- ============================================================
    -- 🔧 自动执行区域 (请勿修改)
    -- ============================================================
    v_user_uuid UUID;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_old_plan VARCHAR(20);
    v_old_status VARCHAR(20);

BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE '🚀 VidFab 用户管理工具';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '目标邮箱: %', v_target_email;
    RAISE NOTICE '';

    -- ============================================================
    -- Step 1: 查找用户
    -- ============================================================
    SELECT uuid, credits_remaining, subscription_plan, subscription_status
    INTO v_user_uuid, v_current_credits, v_old_plan, v_old_status
    FROM users
    WHERE email = v_target_email;

    -- 检查用户是否存在
    IF v_user_uuid IS NULL THEN
        RAISE EXCEPTION '❌ 错误: 未找到用户 "%"', v_target_email;
    END IF;

    RAISE NOTICE '✅ 找到用户';
    RAISE NOTICE '   UUID: %', v_user_uuid;
    RAISE NOTICE '   当前积分: %', v_current_credits;
    RAISE NOTICE '   当前套餐: % (%)', v_old_plan, v_old_status;
    RAISE NOTICE '';

    -- ============================================================
    -- Step 2: 更新积分
    -- ============================================================
    IF v_credits_to_add != 0 THEN
        RAISE NOTICE '----------------------------------------------------------------';
        RAISE NOTICE '💰 更新积分中...';

        v_new_credits := v_current_credits + v_credits_to_add;

        -- 检查余额
        IF v_new_credits < 0 THEN
            RAISE EXCEPTION '❌ 积分不足! 当前: %, 需要: %, 缺少: %',
                v_current_credits,
                ABS(v_credits_to_add),
                ABS(v_new_credits);
        END IF;

        -- 更新积分
        UPDATE users
        SET
            credits_remaining = v_new_credits,
            updated_at = NOW()
        WHERE uuid = v_user_uuid;

        RAISE NOTICE '✅ 积分更新成功';
        RAISE NOTICE '   变更: %', v_credits_to_add;
        RAISE NOTICE '   更新前: %', v_current_credits;
        RAISE NOTICE '   更新后: %', v_new_credits;
        RAISE NOTICE '';

        -- 更新当前积分值供后续使用
        v_current_credits := v_new_credits;
    ELSE
        RAISE NOTICE '⏭️  跳过积分更新 (变更量为 0)';
        RAISE NOTICE '';
    END IF;

    -- ============================================================
    -- Step 3: 更新套餐 (可选)
    -- ============================================================
    IF v_update_plan THEN
        RAISE NOTICE '----------------------------------------------------------------';
        RAISE NOTICE '📦 更新套餐中...';

        -- 验证套餐类型
        IF v_new_plan NOT IN ('basic', 'pro', 'enterprise') THEN
            RAISE EXCEPTION '❌ 无效的套餐: "%". 有效值: basic, pro, enterprise', v_new_plan;
        END IF;

        -- 验证状态
        IF v_new_status NOT IN ('active', 'inactive', 'cancelled', 'past_due') THEN
            RAISE EXCEPTION '❌ 无效的状态: "%". 有效值: active, inactive, cancelled, past_due', v_new_status;
        END IF;

        -- 更新套餐
        UPDATE users
        SET
            subscription_plan = v_new_plan,
            subscription_status = v_new_status,
            updated_at = NOW()
        WHERE uuid = v_user_uuid;

        RAISE NOTICE '✅ 套餐更新成功';
        RAISE NOTICE '   原套餐: % (%)', v_old_plan, v_old_status;
        RAISE NOTICE '   新套餐: % (%)', v_new_plan, v_new_status;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '⏭️  跳过套餐更新';
        RAISE NOTICE '';
    END IF;

    -- ============================================================
    -- 完成
    -- ============================================================
    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ 操作完成!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================================';
        RAISE NOTICE '❌ 执行失败!';
        RAISE NOTICE 'SQL错误: %', SQLERRM;
        RAISE NOTICE '================================================================';
        RAISE;
END $$;

-- ============================================================
-- 📊 查看执行结果
-- ============================================================

-- 查询用户最新状态
SELECT
    email AS "邮箱",
    nickname AS "昵称",
    credits_remaining AS "当前积分",
    subscription_plan AS "订阅套餐",
    subscription_status AS "订阅状态",
    total_videos_processed AS "总处理视频数",
    created_at AS "注册时间",
    updated_at AS "最后更新"
FROM users
WHERE email = 'danielle.wen1994@gmail.com'  -- ⚠️ 修改为你的目标邮箱
LIMIT 1;

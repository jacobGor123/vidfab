-- ================================================================
-- VidFab 管理员工具 - 手动调整用户积分和套餐 (简化版)
-- ================================================================
-- 用途：为指定邮箱的用户增加积分或修改订阅套餐
-- 特点：兼容基础版数据库结构,不依赖扩展字段
-- 使用方法：
--   1. 修改下方 "配置区" 的变量值
--   2. 在 Supabase SQL Editor 中执行整个脚本
--   3. 查看执行结果和操作日志
-- ================================================================

-- ============================================================
-- 配置区 - 请修改以下变量
-- ============================================================

DO $$
DECLARE
    -- ⚙️ 请修改这里的配置
    v_target_email VARCHAR(255) := 'danielle.wen1994@gmail.com';  -- 目标用户邮箱

    -- 积分操作配置
    v_credits_to_add INTEGER := 100;  -- 要增加的积分数量 (正数为增加,负数为扣减)
    v_credits_description TEXT := 'Admin manual adjustment';  -- 积分变更说明

    -- 套餐操作配置
    v_update_plan BOOLEAN := FALSE;  -- 是否更新订阅套餐 (TRUE=更新, FALSE=不更新)
    v_new_plan VARCHAR(20) := 'pro';  -- 新套餐类型: 'basic', 'pro', 'enterprise'
    v_new_status VARCHAR(20) := 'active';  -- 新订阅状态: 'active', 'inactive', 'cancelled', 'past_due'
    v_plan_description TEXT := 'Admin manual plan update';  -- 套餐变更说明

    -- ============================================================
    -- 以下是自动执行区域,请勿修改
    -- ============================================================
    v_user_uuid UUID;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_old_plan VARCHAR(20);
    v_old_status VARCHAR(20);
    v_transaction_id UUID;

BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE '开始执行用户管理操作';
    RAISE NOTICE '目标邮箱: %', v_target_email;
    RAISE NOTICE '================================================================';

    -- Step 1: 查找用户
    RAISE NOTICE '正在查找用户...';
    SELECT uuid, credits_remaining, subscription_plan, subscription_status
    INTO v_user_uuid, v_current_credits, v_old_plan, v_old_status
    FROM users
    WHERE email = v_target_email;

    -- 检查用户是否存在
    IF v_user_uuid IS NULL THEN
        RAISE EXCEPTION '❌ 错误: 未找到邮箱为 "%" 的用户', v_target_email;
    END IF;

    RAISE NOTICE '✅ 找到用户: UUID = %', v_user_uuid;
    RAISE NOTICE '当前积分: %', v_current_credits;
    RAISE NOTICE '当前套餐: % (%)', v_old_plan, v_old_status;
    RAISE NOTICE '';

    -- ============================================================
    -- Step 2: 更新积分
    -- ============================================================
    IF v_credits_to_add != 0 THEN
        RAISE NOTICE '----------------------------------------------------------------';
        RAISE NOTICE '开始更新积分...';

        v_new_credits := v_current_credits + v_credits_to_add;

        -- 检查积分是否为负数
        IF v_new_credits < 0 THEN
            RAISE EXCEPTION '❌ 错误: 积分不足。当前积分: %, 尝试扣减: %, 结果: %',
                v_current_credits, ABS(v_credits_to_add), v_new_credits;
        END IF;

        -- 更新用户积分 (只更新基础字段)
        UPDATE users
        SET
            credits_remaining = v_new_credits,
            updated_at = NOW()
        WHERE uuid = v_user_uuid;

        -- 记录积分交易 (如果表存在)
        BEGIN
            INSERT INTO credits_transactions (
                user_uuid,
                transaction_type,
                credits_amount,
                balance_before,
                balance_after,
                description,
                metadata,
                created_at
            ) VALUES (
                v_user_uuid,
                CASE WHEN v_credits_to_add > 0 THEN 'bonus' ELSE 'spent' END,
                v_credits_to_add,
                v_current_credits,
                v_new_credits,
                v_credits_description,
                jsonb_build_object(
                    'operation_type', 'admin_manual_adjustment',
                    'operated_by', 'admin',
                    'operated_at', NOW()
                ),
                NOW()
            ) RETURNING id INTO v_transaction_id;

            RAISE NOTICE '   交易记录ID: %', v_transaction_id;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '   ⚠️  credits_transactions 表不存在,跳过交易记录';
            WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️  无法记录交易: %', SQLERRM;
        END;

        RAISE NOTICE '✅ 积分更新成功!';
        RAISE NOTICE '   变更量: %', v_credits_to_add;
        RAISE NOTICE '   更新前: %', v_current_credits;
        RAISE NOTICE '   更新后: %', v_new_credits;
    ELSE
        RAISE NOTICE '⏭️  跳过积分更新 (变更量为 0)';
    END IF;

    RAISE NOTICE '';

    -- ============================================================
    -- Step 3: 更新订阅套餐
    -- ============================================================
    IF v_update_plan THEN
        RAISE NOTICE '----------------------------------------------------------------';
        RAISE NOTICE '开始更新订阅套餐...';

        -- 验证套餐类型 (使用基础版的套餐类型)
        IF v_new_plan NOT IN ('basic', 'pro', 'enterprise') THEN
            RAISE EXCEPTION '❌ 错误: 无效的套餐类型 "%". 有效值: basic, pro, enterprise', v_new_plan;
        END IF;

        -- 验证订阅状态
        IF v_new_status NOT IN ('active', 'inactive', 'cancelled', 'past_due') THEN
            RAISE EXCEPTION '❌ 错误: 无效的订阅状态 "%". 有效值: active, inactive, cancelled, past_due', v_new_status;
        END IF;

        -- 更新用户套餐
        UPDATE users
        SET
            subscription_plan = v_new_plan,
            subscription_status = v_new_status,
            updated_at = NOW()
        WHERE uuid = v_user_uuid;

        -- 记录套餐变更历史 (如果表存在)
        BEGIN
            INSERT INTO subscription_changes (
                user_uuid,
                from_plan,
                to_plan,
                change_type,
                credits_before,
                credits_after,
                credits_adjustment,
                reason,
                metadata,
                effective_date,
                created_at
            ) VALUES (
                v_user_uuid,
                v_old_plan,
                v_new_plan,
                CASE
                    WHEN v_old_plan IS NULL OR v_old_plan = 'basic' THEN 'new_subscription'
                    WHEN v_new_plan = 'basic' THEN 'cancellation'
                    ELSE 'upgrade'
                END,
                v_current_credits,
                COALESCE(v_new_credits, v_current_credits),
                COALESCE(v_credits_to_add, 0),
                v_plan_description,
                jsonb_build_object(
                    'operation_type', 'admin_manual_adjustment',
                    'operated_by', 'admin',
                    'old_status', v_old_status,
                    'new_status', v_new_status,
                    'operated_at', NOW()
                ),
                NOW(),
                NOW()
            );
            RAISE NOTICE '   ✅ 套餐变更已记录';
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '   ⚠️  subscription_changes 表不存在,跳过变更记录';
            WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️  无法记录套餐变更: %', SQLERRM;
        END;

        RAISE NOTICE '✅ 套餐更新成功!';
        RAISE NOTICE '   原套餐: % (%)', v_old_plan, v_old_status;
        RAISE NOTICE '   新套餐: % (%)', v_new_plan, v_new_status;
    ELSE
        RAISE NOTICE '⏭️  跳过套餐更新 (v_update_plan = FALSE)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ 所有操作执行完成!';
    RAISE NOTICE '================================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================================';
        RAISE NOTICE '❌ 执行失败!';
        RAISE NOTICE '错误信息: %', SQLERRM;
        RAISE NOTICE '================================================================';
        RAISE;
END $$;

-- ============================================================
-- 查询执行结果
-- ============================================================

-- 查看用户当前状态
SELECT
    email,
    subscription_plan,
    subscription_status,
    credits_remaining,
    created_at,
    updated_at
FROM users
WHERE email = 'danielle.wen1994@gmail.com'  -- ⚠️ 记得修改为你的目标邮箱
LIMIT 1;

-- 查看最近的积分交易记录 (如果表存在)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credits_transactions') THEN
        RAISE NOTICE '查询积分交易记录...';
    ELSE
        RAISE NOTICE 'credits_transactions 表不存在';
    END IF;
END $$;

SELECT
    ct.id,
    ct.transaction_type,
    ct.credits_amount,
    ct.balance_before,
    ct.balance_after,
    ct.description,
    ct.created_at
FROM credits_transactions ct
JOIN users u ON ct.user_uuid = u.uuid
WHERE u.email = 'danielle.wen1994@gmail.com'  -- ⚠️ 记得修改为你的目标邮箱
ORDER BY ct.created_at DESC
LIMIT 5;

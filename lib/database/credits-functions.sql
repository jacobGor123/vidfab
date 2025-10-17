-- VidFab Credits管理数据库函数
-- 支持CreditsManager服务的原子性操作

-- 1. 预扣积分函数
CREATE OR REPLACE FUNCTION reserve_user_credits(
    p_user_uuid UUID,
    p_required_credits INTEGER,
    p_model_name VARCHAR(50),
    p_video_job_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    current_balance INTEGER;
    reservation_id UUID;
    concurrent_count INTEGER;
    max_concurrent INTEGER;
    user_plan VARCHAR(20);
BEGIN
    -- 获取用户当前状态
    SELECT credits_remaining, concurrent_jobs_running, subscription_plan
    INTO current_balance, concurrent_count, user_plan
    FROM users
    WHERE uuid = p_user_uuid;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    -- 检查积分余额
    IF current_balance < p_required_credits THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', p_required_credits, current_balance;
    END IF;

    -- 检查并发任务限制
    CASE user_plan
        WHEN 'free' THEN max_concurrent := 1;
        WHEN 'lite' THEN max_concurrent := 4;
        WHEN 'pro' THEN max_concurrent := 4;
        WHEN 'premium' THEN max_concurrent := 4;
        ELSE max_concurrent := 1;
    END CASE;

    IF concurrent_count >= max_concurrent THEN
        RAISE EXCEPTION 'Concurrent job limit exceeded. Max: %, Current: %', max_concurrent, concurrent_count;
    END IF;

    -- 创建预扣记录
    INSERT INTO credits_reservations (
        user_uuid, video_job_id, reserved_credits, model_name,
        estimated_cost, status, expires_at, metadata
    ) VALUES (
        p_user_uuid, p_video_job_id, p_required_credits, p_model_name,
        p_required_credits, 'active', NOW() + INTERVAL '10 minutes', p_metadata
    ) RETURNING id INTO reservation_id;

    -- 暂时减少用户积分余额（预扣）
    UPDATE users
    SET
        credits_remaining = credits_remaining - p_required_credits,
        concurrent_jobs_running = concurrent_jobs_running + 1,
        updated_at = NOW()
    WHERE uuid = p_user_uuid;

    RETURN reservation_id;
END;
$$ LANGUAGE plpgsql;

-- 2. 消费预扣积分函数
CREATE OR REPLACE FUNCTION consume_reserved_credits(
    p_reservation_id UUID,
    p_actual_credits INTEGER,
    p_consumed_by VARCHAR(50),
    p_video_job_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    reservation_record RECORD;
    refund_amount INTEGER;
    user_uuid UUID;
BEGIN
    -- 获取预扣记录
    SELECT * INTO reservation_record
    FROM credits_reservations
    WHERE id = p_reservation_id AND status = 'active';

    IF reservation_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or already consumed');
    END IF;

    user_uuid := reservation_record.user_uuid;

    -- 计算需要退还的积分
    refund_amount := reservation_record.reserved_credits - p_actual_credits;

    -- 如果实际消费超过预扣，检查余额
    IF refund_amount < 0 THEN
        DECLARE
            current_balance INTEGER;
        BEGIN
            SELECT credits_remaining INTO current_balance FROM users WHERE uuid = user_uuid;
            IF current_balance < ABS(refund_amount) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits for actual consumption');
            END IF;
        END;
    END IF;

    -- 更新用户积分余额（返还差额或扣除额外消费）
    UPDATE users
    SET
        credits_remaining = credits_remaining + refund_amount,
        total_credits_spent = total_credits_spent + p_actual_credits,
        concurrent_jobs_running = GREATEST(0, concurrent_jobs_running - 1),
        updated_at = NOW()
    WHERE uuid = user_uuid;

    -- 标记预扣记录为已消费
    UPDATE credits_reservations
    SET
        status = 'consumed',
        consumed_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'actual_credits_used', p_actual_credits,
            'refund_amount', refund_amount,
            'consumed_by', p_consumed_by
        )
    WHERE id = p_reservation_id;

    -- 记录积分消费交易
    INSERT INTO credits_transactions (
        user_uuid, transaction_type, credits_amount,
        balance_after, consumed_by, video_job_id, model_used,
        description, metadata
    ) VALUES (
        user_uuid, 'spent', -p_actual_credits,
        (SELECT credits_remaining FROM users WHERE uuid = user_uuid),
        p_consumed_by, p_video_job_id, reservation_record.model_name,
        format('Credits consumed for %s video generation', reservation_record.model_name),
        jsonb_build_object(
            'reservation_id', p_reservation_id,
            'model', reservation_record.model_name,
            'refund_amount', refund_amount
        )
    );

    -- 如果有退还积分，也记录退还交易
    IF refund_amount > 0 THEN
        INSERT INTO credits_transactions (
            user_uuid, transaction_type, credits_amount,
            balance_after, description, metadata
        ) VALUES (
            user_uuid, 'refunded', refund_amount,
            (SELECT credits_remaining FROM users WHERE uuid = user_uuid),
            format('Refund for over-reserved credits: %s', reservation_record.model_name),
            jsonb_build_object(
                'reservation_id', p_reservation_id,
                'model', reservation_record.model_name,
                'original_reserved', reservation_record.reserved_credits,
                'actual_used', p_actual_credits
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'credits_consumed', p_actual_credits,
        'refund_amount', refund_amount,
        'new_balance', (SELECT credits_remaining FROM users WHERE uuid = user_uuid)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 更新并发任务计数函数
CREATE OR REPLACE FUNCTION update_concurrent_jobs(
    p_user_uuid UUID,
    p_increment INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE users
    SET
        concurrent_jobs_running = GREATEST(0, concurrent_jobs_running + p_increment),
        updated_at = NOW()
    WHERE uuid = p_user_uuid
    RETURNING concurrent_jobs_running INTO new_count;

    IF new_count IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- 4. 批量积分更新函数
CREATE OR REPLACE FUNCTION batch_credits_update(
    operations JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    operation JSONB;
    user_uuid UUID;
    credits_change INTEGER;
    transaction_type VARCHAR(20);
    description TEXT;
    metadata JSONB;
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- 遍历所有操作
    FOR operation IN SELECT * FROM jsonb_array_elements(operations)
    LOOP
        user_uuid := (operation->>'userUuid')::UUID;
        credits_change := (operation->>'creditsChange')::INTEGER;
        transaction_type := operation->>'transactionType';
        description := operation->>'description';
        metadata := COALESCE(operation->'metadata', '{}');

        -- 获取当前余额
        SELECT credits_remaining INTO current_balance
        FROM users WHERE uuid = user_uuid;

        IF current_balance IS NULL THEN
            RAISE EXCEPTION 'User not found in batch operation: %', user_uuid;
        END IF;

        -- 计算新余额
        new_balance := current_balance + credits_change;

        -- 检查余额不为负数
        IF new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient credits in batch operation. User: %, Required: %, Available: %',
                user_uuid, ABS(credits_change), current_balance;
        END IF;

        -- 更新用户余额
        UPDATE users
        SET
            credits_remaining = new_balance,
            total_credits_spent = CASE
                WHEN credits_change < 0 THEN total_credits_spent + ABS(credits_change)
                ELSE total_credits_spent
            END,
            total_credits_earned = CASE
                WHEN credits_change > 0 THEN total_credits_earned + credits_change
                ELSE total_credits_earned
            END,
            updated_at = NOW()
        WHERE uuid = user_uuid;

        -- 记录交易
        INSERT INTO credits_transactions (
            user_uuid, transaction_type, credits_amount,
            balance_before, balance_after, description, metadata
        ) VALUES (
            user_uuid, transaction_type, credits_change,
            current_balance, new_balance, description, metadata
        );
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. 积分重置函数（改进版）
CREATE OR REPLACE FUNCTION reset_user_monthly_credits(
    p_user_uuid UUID,
    p_plan_id VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
    plan_credits INTEGER;
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- 根据计划获取应发放的积分
    CASE p_plan_id
        WHEN 'free' THEN plan_credits := 50;
        WHEN 'lite' THEN plan_credits := 300;
        WHEN 'pro' THEN plan_credits := 1000;
        WHEN 'premium' THEN plan_credits := 2000;
        ELSE
            RAISE EXCEPTION 'Invalid plan ID: %', p_plan_id;
    END CASE;

    -- 获取当前余额
    SELECT credits_remaining INTO current_balance
    FROM users WHERE uuid = p_user_uuid;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    -- 对于付费用户，允许一定程度的积分累积
    IF p_plan_id != 'free' THEN
        -- 付费用户最多累积到计划积分的1.5倍
        new_balance := LEAST(current_balance + plan_credits, plan_credits * 1.5);
    ELSE
        -- 免费用户重置为计划积分
        new_balance := plan_credits;
    END IF;

    -- 更新用户积分
    UPDATE users
    SET
        credits_remaining = new_balance,
        credits_last_reset_date = NOW(),
        total_credits_earned = total_credits_earned + (new_balance - current_balance),
        updated_at = NOW()
    WHERE uuid = p_user_uuid;

    -- 记录积分发放交易
    IF new_balance > current_balance THEN
        INSERT INTO credits_transactions (
            user_uuid, transaction_type, credits_amount,
            balance_before, balance_after, description, metadata
        ) VALUES (
            p_user_uuid, 'earned', new_balance - current_balance,
            current_balance, new_balance,
            format('Monthly credits reset for %s plan', p_plan_id),
            jsonb_build_object(
                'plan_id', p_plan_id,
                'reset_type', 'monthly',
                'plan_credits', plan_credits,
                'accumulated', new_balance > plan_credits
            )
        );
    END IF;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- 6. 清理过期预扣记录函数（改进版）
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS JSONB AS $$
DECLARE
    expired_reservations RECORD;
    cleaned_count INTEGER := 0;
    refunded_credits INTEGER := 0;
BEGIN
    -- 处理过期的活跃预扣记录
    FOR expired_reservations IN
        SELECT * FROM credits_reservations
        WHERE status = 'active' AND expires_at < NOW()
    LOOP
        -- 返还积分给用户
        UPDATE users
        SET
            credits_remaining = credits_remaining + expired_reservations.reserved_credits,
            concurrent_jobs_running = GREATEST(0, concurrent_jobs_running - 1),
            updated_at = NOW()
        WHERE uuid = expired_reservations.user_uuid;

        -- 记录退还交易
        INSERT INTO credits_transactions (
            user_uuid, transaction_type, credits_amount,
            balance_after, description, metadata
        ) VALUES (
            expired_reservations.user_uuid, 'refunded', expired_reservations.reserved_credits,
            (SELECT credits_remaining FROM users WHERE uuid = expired_reservations.user_uuid),
            'Credits refunded for expired reservation',
            jsonb_build_object(
                'reservation_id', expired_reservations.id,
                'model', expired_reservations.model_name,
                'expired_at', expired_reservations.expires_at,
                'cleanup_reason', 'expired'
            )
        );

        cleaned_count := cleaned_count + 1;
        refunded_credits := refunded_credits + expired_reservations.reserved_credits;
    END LOOP;

    -- 标记过期记录
    UPDATE credits_reservations
    SET status = 'expired', metadata = metadata || jsonb_build_object('expired_at', NOW())
    WHERE status = 'active' AND expires_at < NOW();

    -- 删除超过24小时的过期记录
    DELETE FROM credits_reservations
    WHERE status = 'expired' AND expires_at < NOW() - INTERVAL '24 hours';

    RETURN jsonb_build_object(
        'cleaned_count', cleaned_count,
        'refunded_credits', refunded_credits,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 7. 获取用户积分统计函数
CREATE OR REPLACE FUNCTION get_user_credits_stats(p_user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_info RECORD;
    stats JSONB;
BEGIN
    -- 获取用户基本信息
    SELECT
        credits_remaining,
        total_credits_earned,
        total_credits_spent,
        subscription_plan,
        concurrent_jobs_running,
        credits_last_reset_date
    INTO user_info
    FROM users
    WHERE uuid = p_user_uuid;

    IF user_info IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- 获取最近30天的消费统计
    WITH recent_usage AS (
        SELECT
            COUNT(*) FILTER (WHERE transaction_type = 'spent') as transactions_count,
            COALESCE(SUM(ABS(credits_amount)) FILTER (WHERE transaction_type = 'spent'), 0) as credits_spent_30d,
            COALESCE(SUM(credits_amount) FILTER (WHERE transaction_type = 'earned'), 0) as credits_earned_30d
        FROM credits_transactions
        WHERE user_uuid = p_user_uuid
        AND created_at >= NOW() - INTERVAL '30 days'
    ),
    active_reservations AS (
        SELECT
            COUNT(*) as active_count,
            COALESCE(SUM(reserved_credits), 0) as reserved_total
        FROM credits_reservations
        WHERE user_uuid = p_user_uuid AND status = 'active'
    )
    SELECT jsonb_build_object(
        'current_balance', user_info.credits_remaining,
        'total_earned', user_info.total_credits_earned,
        'total_spent', user_info.total_credits_spent,
        'plan', user_info.subscription_plan,
        'concurrent_jobs', user_info.concurrent_jobs_running,
        'last_reset', user_info.credits_last_reset_date,
        'recent_30d', jsonb_build_object(
            'transactions', r.transactions_count,
            'spent', r.credits_spent_30d,
            'earned', r.credits_earned_30d
        ),
        'active_reservations', jsonb_build_object(
            'count', ar.active_count,
            'total_reserved', ar.reserved_total
        ),
        'available_balance', user_info.credits_remaining - COALESCE(ar.reserved_total, 0)
    ) INTO stats
    FROM recent_usage r, active_reservations ar;

    RETURN stats;
END;
$$ LANGUAGE plpgsql;
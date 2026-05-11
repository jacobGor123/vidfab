-- Add idempotency guards for Stripe processing and atomic credits helpers.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS credits_monthly_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS concurrent_jobs_running INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_last_reset_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_credits_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_spent INTEGER DEFAULT 0;

ALTER TABLE credits_transactions
ADD COLUMN IF NOT EXISTS description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_orders_checkout_session_unique
ON subscription_orders (stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_orders_payment_intent_unique
ON subscription_orders (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

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
    SELECT COALESCE(credits_remaining, 0)
    INTO current_balance
    FROM users
    WHERE uuid = p_user_uuid
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    new_balance := current_balance + p_credits_change;

    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %',
            current_balance,
            ABS(p_credits_change);
    END IF;

    UPDATE users
    SET
        credits_remaining = new_balance,
        total_credits_spent = CASE
            WHEN p_credits_change < 0 THEN COALESCE(total_credits_spent, 0) + ABS(p_credits_change)
            ELSE COALESCE(total_credits_spent, 0)
        END,
        total_credits_earned = CASE
            WHEN p_credits_change > 0 THEN COALESCE(total_credits_earned, 0) + p_credits_change
            ELSE COALESCE(total_credits_earned, 0)
        END,
        updated_at = NOW()
    WHERE uuid = p_user_uuid;

    INSERT INTO credits_transactions (
        user_uuid,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        metadata
    ) VALUES (
        p_user_uuid,
        p_transaction_type,
        p_credits_change,
        current_balance,
        new_balance,
        p_description,
        p_metadata
    );

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_user_credits_atomic(
    p_user_uuid UUID,
    p_credits INTEGER,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    IF p_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credits must be positive');
    END IF;

    UPDATE users
    SET
        credits_remaining = credits_remaining - p_credits,
        total_credits_spent = COALESCE(total_credits_spent, 0) + p_credits,
        updated_at = NOW()
    WHERE uuid = p_user_uuid
      AND COALESCE(credits_remaining, 0) >= p_credits
    RETURNING credits_remaining INTO new_balance;

    IF new_balance IS NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE uuid = p_user_uuid) THEN
            RETURN jsonb_build_object('success', false, 'error', 'User not found');
        END IF;

        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    INSERT INTO credits_transactions (
        user_uuid,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        metadata
    ) VALUES (
        p_user_uuid,
        'spent',
        -p_credits,
        new_balance + p_credits,
        new_balance,
        p_description,
        p_metadata
    );

    RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_user_credits_atomic(
    p_user_uuid UUID,
    p_credits INTEGER,
    p_transaction_type VARCHAR(20) DEFAULT 'refunded',
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    old_balance INTEGER;
    new_balance INTEGER;
BEGIN
    IF p_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credits must be positive');
    END IF;

    SELECT COALESCE(credits_remaining, 0)
    INTO old_balance
    FROM users
    WHERE uuid = p_user_uuid
    FOR UPDATE;

    IF old_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    new_balance := old_balance + p_credits;

    UPDATE users
    SET
        credits_remaining = new_balance,
        total_credits_earned = CASE
            WHEN p_transaction_type IN ('earned', 'bonus') THEN COALESCE(total_credits_earned, 0) + p_credits
            ELSE COALESCE(total_credits_earned, 0)
        END,
        updated_at = NOW()
    WHERE uuid = p_user_uuid;

    INSERT INTO credits_transactions (
        user_uuid,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        metadata
    ) VALUES (
        p_user_uuid,
        p_transaction_type,
        p_credits,
        old_balance,
        new_balance,
        p_description,
        p_metadata
    );

    RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql;

-- Split credits into monthly subscription credits and non-expiring other credits.
-- credits_remaining remains the compatibility total:
--   credits_remaining = credits_monthly_balance + credits_other_balance

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits_monthly_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_other_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_next_reset_at TIMESTAMPTZ;

-- Backfill existing users conservatively:
-- free users keep all current credits as non-expiring other credits;
-- paid users keep one plan allocation as monthly credits and any excess as other credits.
UPDATE users
SET
  credits_monthly_total = CASE
    WHEN subscription_plan = 'premium' THEN 3500
    WHEN subscription_plan = 'pro' THEN 1500
    WHEN subscription_plan = 'lite' THEN 300
    ELSE 0
  END,
  credits_monthly_balance = CASE
    WHEN subscription_plan = 'premium' THEN LEAST(COALESCE(credits_remaining, 0), 3500)
    WHEN subscription_plan = 'pro' THEN LEAST(COALESCE(credits_remaining, 0), 1500)
    WHEN subscription_plan = 'lite' THEN LEAST(COALESCE(credits_remaining, 0), 300)
    ELSE 0
  END,
  credits_other_balance = CASE
    WHEN subscription_plan = 'premium' THEN GREATEST(COALESCE(credits_remaining, 0) - 3500, 0)
    WHEN subscription_plan = 'pro' THEN GREATEST(COALESCE(credits_remaining, 0) - 1500, 0)
    WHEN subscription_plan = 'lite' THEN GREATEST(COALESCE(credits_remaining, 0) - 300, 0)
    ELSE COALESCE(credits_remaining, 0)
  END,
  credits_last_reset_date = COALESCE(credits_last_reset_date, NOW()),
  credits_next_reset_at = CASE
    WHEN subscription_plan IN ('lite', 'pro', 'premium')
      THEN COALESCE(credits_next_reset_at, LEAST(NOW() + INTERVAL '1 month', COALESCE(subscription_period_end, NOW() + INTERVAL '1 month')))
    ELSE NULL
  END
WHERE COALESCE(credits_monthly_balance, 0) = 0
  AND COALESCE(credits_other_balance, 0) = 0;

UPDATE users
SET credits_remaining = COALESCE(credits_monthly_balance, 0) + COALESCE(credits_other_balance, 0);

CREATE OR REPLACE FUNCTION update_user_credits_balance(
    p_user_uuid UUID,
    p_credits_change INTEGER,
    p_transaction_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    current_monthly INTEGER;
    current_other INTEGER;
    current_balance INTEGER;
    new_monthly INTEGER;
    new_other INTEGER;
    new_balance INTEGER;
    monthly_spent INTEGER;
    other_spent INTEGER;
    monthly_space INTEGER;
    to_monthly INTEGER;
BEGIN
    SELECT
      COALESCE(credits_monthly_balance, 0),
      COALESCE(credits_other_balance, 0),
      COALESCE(credits_remaining, 0)
    INTO current_monthly, current_other, current_balance
    FROM users
    WHERE uuid = p_user_uuid
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_uuid;
    END IF;

    new_monthly := current_monthly;
    new_other := current_other;

    IF p_credits_change < 0 THEN
        IF current_balance < ABS(p_credits_change) THEN
            RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %',
                current_balance,
                ABS(p_credits_change);
        END IF;

        monthly_spent := LEAST(current_monthly, ABS(p_credits_change));
        other_spent := ABS(p_credits_change) - monthly_spent;
        new_monthly := current_monthly - monthly_spent;
        new_other := current_other - other_spent;
    ELSIF p_credits_change > 0 THEN
        IF p_transaction_type = 'refunded' THEN
            SELECT GREATEST(COALESCE(credits_monthly_total, 0) - current_monthly, 0)
            INTO monthly_space
            FROM users
            WHERE uuid = p_user_uuid;

            to_monthly := LEAST(monthly_space, p_credits_change);
            new_monthly := current_monthly + to_monthly;
            new_other := current_other + (p_credits_change - to_monthly);
        ELSE
            new_other := current_other + p_credits_change;
        END IF;
    END IF;

    new_balance := new_monthly + new_other;

    UPDATE users
    SET
        credits_monthly_balance = new_monthly,
        credits_other_balance = new_other,
        credits_remaining = new_balance,
        total_credits_spent = CASE
            WHEN p_credits_change < 0 THEN COALESCE(total_credits_spent, 0) + ABS(p_credits_change)
            ELSE COALESCE(total_credits_spent, 0)
        END,
        total_credits_earned = CASE
            WHEN p_credits_change > 0 AND p_transaction_type IN ('earned', 'bonus') THEN COALESCE(total_credits_earned, 0) + p_credits_change
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
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
          'monthly_balance_before', current_monthly,
          'monthly_balance_after', new_monthly,
          'other_balance_before', current_other,
          'other_balance_after', new_other
        )
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
    current_monthly INTEGER;
    current_other INTEGER;
    current_balance INTEGER;
    monthly_spent INTEGER;
    other_spent INTEGER;
    new_monthly INTEGER;
    new_other INTEGER;
    new_balance INTEGER;
BEGIN
    IF p_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credits must be positive');
    END IF;

    SELECT
      COALESCE(credits_monthly_balance, 0),
      COALESCE(credits_other_balance, 0),
      COALESCE(credits_remaining, 0)
    INTO current_monthly, current_other, current_balance
    FROM users
    WHERE uuid = p_user_uuid
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF current_balance < p_credits THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'new_balance', current_balance);
    END IF;

    monthly_spent := LEAST(current_monthly, p_credits);
    other_spent := p_credits - monthly_spent;
    new_monthly := current_monthly - monthly_spent;
    new_other := current_other - other_spent;
    new_balance := new_monthly + new_other;

    UPDATE users
    SET
        credits_monthly_balance = new_monthly,
        credits_other_balance = new_other,
        credits_remaining = new_balance,
        total_credits_spent = COALESCE(total_credits_spent, 0) + p_credits,
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
        'spent',
        -p_credits,
        current_balance,
        new_balance,
        p_description,
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
          'monthly_spent', monthly_spent,
          'other_spent', other_spent,
          'monthly_balance_before', current_monthly,
          'monthly_balance_after', new_monthly,
          'other_balance_before', current_other,
          'other_balance_after', new_other
        )
    );

    RETURN jsonb_build_object(
      'success', true,
      'new_balance', new_balance,
      'monthly_spent', monthly_spent,
      'other_spent', other_spent
    );
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
    current_monthly INTEGER;
    current_other INTEGER;
    current_balance INTEGER;
    monthly_total INTEGER;
    monthly_space INTEGER;
    to_monthly INTEGER;
    new_monthly INTEGER;
    new_other INTEGER;
    new_balance INTEGER;
BEGIN
    IF p_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credits must be positive');
    END IF;

    SELECT
      COALESCE(credits_monthly_balance, 0),
      COALESCE(credits_other_balance, 0),
      COALESCE(credits_remaining, 0),
      COALESCE(credits_monthly_total, 0)
    INTO current_monthly, current_other, current_balance, monthly_total
    FROM users
    WHERE uuid = p_user_uuid
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF p_transaction_type = 'refunded' THEN
        monthly_space := GREATEST(monthly_total - current_monthly, 0);
        to_monthly := LEAST(monthly_space, p_credits);
        new_monthly := current_monthly + to_monthly;
        new_other := current_other + (p_credits - to_monthly);
    ELSE
        new_monthly := current_monthly;
        new_other := current_other + p_credits;
    END IF;

    new_balance := new_monthly + new_other;

    UPDATE users
    SET
        credits_monthly_balance = new_monthly,
        credits_other_balance = new_other,
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
        current_balance,
        new_balance,
        p_description,
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
          'monthly_balance_before', current_monthly,
          'monthly_balance_after', new_monthly,
          'other_balance_before', current_other,
          'other_balance_after', new_other
        )
    );

    RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql;

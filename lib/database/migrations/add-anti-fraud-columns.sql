-- Migration: add anti-fraud columns to users table
-- Added by anti-fraud Layer 1 + Layer 2 feature (commit eb4548e9, 2026-03-16)
-- These columns were missing from production DB, causing all new user upserts to fail

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS normalized_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_credit_limited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fraud_reason VARCHAR(100);

-- Index on normalized_email for fast duplicate detection (Layer 1 fraud check)
CREATE INDEX IF NOT EXISTS idx_users_normalized_email ON users (normalized_email);

-- Also ensure new_user_ip_grants table exists (Layer 2 fraud check)
CREATE TABLE IF NOT EXISTS new_user_ip_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL,
  user_uuid UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_grants_ip_granted_at
  ON new_user_ip_grants (ip_address, granted, granted_at);

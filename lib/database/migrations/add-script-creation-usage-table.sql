-- Migration: Add script_creation_usage table
-- Purpose: Track monthly script creation quota usage per user
-- Date: 2026-02-14

-- Create script_creation_usage table
CREATE TABLE IF NOT EXISTS script_creation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- Format: 'YYYY-MM' (e.g., '2026-02')
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT script_creation_usage_unique_user_month UNIQUE (user_id, month),
  CONSTRAINT script_creation_usage_count_positive CHECK (count >= 0)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_script_creation_usage_user_id
  ON script_creation_usage(user_id);

-- Create index on month for faster range queries
CREATE INDEX IF NOT EXISTS idx_script_creation_usage_month
  ON script_creation_usage(month);

-- Create composite index for common query pattern (user + current month)
CREATE INDEX IF NOT EXISTS idx_script_creation_usage_user_month
  ON script_creation_usage(user_id, month);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_script_creation_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER script_creation_usage_updated_at
  BEFORE UPDATE ON script_creation_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_script_creation_usage_updated_at();

-- Add comment to table
COMMENT ON TABLE script_creation_usage IS 'Tracks monthly script creation quota usage per user';
COMMENT ON COLUMN script_creation_usage.month IS 'Format: YYYY-MM (e.g., 2026-02)';
COMMENT ON COLUMN script_creation_usage.count IS 'Number of scripts created this month';

-- ===========================================
-- VidFab AI Video Platform
-- Database Tables Migration Script
-- ===========================================
-- This script creates all database tables and policies
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- USER VIDEOS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Generation information
  wavespeed_request_id VARCHAR UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  settings JSONB NOT NULL, -- {model, duration, resolution, aspectRatio, style}

  -- File storage information
  original_url VARCHAR, -- Wavespeed temporary URL
  storage_path VARCHAR, -- Supabase Storage path: videos/{user_id}/{video_id}.mp4
  thumbnail_path VARCHAR, -- Thumbnail path: thumbnails/{user_id}/{video_id}.jpg

  -- File metadata
  file_size BIGINT,
  duration_seconds INTEGER,
  video_resolution VARCHAR,
  aspect_ratio VARCHAR,

  -- Status management
  status VARCHAR NOT NULL DEFAULT 'generating' CHECK (status IN (
    'generating',    -- Wavespeed generation in progress
    'downloading',   -- Downloading to Supabase Storage
    'processing',    -- Generating thumbnails/post-processing
    'completed',     -- Ready for playback
    'failed',        -- Generation or storage failed
    'deleted'        -- Soft deleted
  )),

  error_message TEXT,
  download_progress INTEGER DEFAULT 0 CHECK (download_progress >= 0 AND download_progress <= 100),

  -- User interaction
  is_favorite BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- USER STORAGE QUOTAS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_storage_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_videos INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  max_videos INTEGER DEFAULT 50,        -- Free tier limit
  max_size_bytes BIGINT DEFAULT 5368709120, -- 5GB limit
  plan_type VARCHAR DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON user_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_status ON user_videos(status);
CREATE INDEX IF NOT EXISTS idx_user_videos_created_at ON user_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_videos_wavespeed_id ON user_videos(wavespeed_request_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_videos_user_status ON user_videos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_videos_user_created ON user_videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_videos_user_favorite ON user_videos(user_id, is_favorite) WHERE is_favorite = true;

-- Full-text search index on prompts
CREATE INDEX IF NOT EXISTS idx_user_videos_prompt_search ON user_videos USING gin(to_tsvector('english', prompt));

-- ===========================================
-- TRIGGER FUNCTIONS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_videos updated_at
DROP TRIGGER IF EXISTS update_user_videos_updated_at ON user_videos;
CREATE TRIGGER update_user_videos_updated_at
    BEFORE UPDATE ON user_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_storage_quotas updated_at
DROP TRIGGER IF EXISTS update_user_storage_quotas_updated_at ON user_storage_quotas;
CREATE TRIGGER update_user_storage_quotas_updated_at
    BEFORE UPDATE ON user_storage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- QUOTA MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to update user storage quota automatically
CREATE OR REPLACE FUNCTION update_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT: video status changed to 'completed'
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    INSERT INTO user_storage_quotas (user_id, total_videos, total_size_bytes)
    VALUES (NEW.user_id, 1, COALESCE(NEW.file_size, 0))
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_videos = user_storage_quotas.total_videos + 1,
      total_size_bytes = user_storage_quotas.total_size_bytes + COALESCE(NEW.file_size, 0),
      updated_at = NOW();

  -- Handle UPDATE: status changed from non-completed to completed
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO user_storage_quotas (user_id, total_videos, total_size_bytes)
    VALUES (NEW.user_id, 1, COALESCE(NEW.file_size, 0))
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_videos = user_storage_quotas.total_videos + 1,
      total_size_bytes = user_storage_quotas.total_size_bytes + COALESCE(NEW.file_size, 0),
      updated_at = NOW();

  -- Handle UPDATE: status changed from completed to non-completed
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE user_storage_quotas
    SET
      total_videos = GREATEST(0, total_videos - 1),
      total_size_bytes = GREATEST(0, total_size_bytes - COALESCE(OLD.file_size, 0)),
      updated_at = NOW()
    WHERE user_id = OLD.user_id;

  -- Handle DELETE: remove completed video from quota
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    UPDATE user_storage_quotas
    SET
      total_videos = GREATEST(0, total_videos - 1),
      total_size_bytes = GREATEST(0, total_size_bytes - COALESCE(OLD.file_size, 0)),
      updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create quota update trigger
DROP TRIGGER IF EXISTS trigger_update_user_quota ON user_videos;
CREATE TRIGGER trigger_update_user_quota
  AFTER INSERT OR UPDATE OR DELETE ON user_videos
  FOR EACH ROW EXECUTE FUNCTION update_user_quota();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to check if user can upload more videos
CREATE OR REPLACE FUNCTION can_user_upload_video(user_uuid UUID, estimated_size BIGINT DEFAULT 0)
RETURNS BOOLEAN AS $$
DECLARE
  quota RECORD;
BEGIN
  -- Get user's current quota
  SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;

  -- If no quota record exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO user_storage_quotas (user_id) VALUES (user_uuid);
    RETURN TRUE;
  END IF;

  -- Check video count limit
  IF quota.total_videos >= quota.max_videos THEN
    RETURN FALSE;
  END IF;

  -- Check storage size limit
  IF (quota.total_size_bytes + estimated_size) > quota.max_size_bytes THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's quota information
CREATE OR REPLACE FUNCTION get_user_quota(user_uuid UUID)
RETURNS TABLE(
  current_videos INTEGER,
  max_videos INTEGER,
  current_size_bytes BIGINT,
  max_size_bytes BIGINT,
  current_size_mb NUMERIC,
  max_size_mb NUMERIC,
  videos_percentage NUMERIC,
  storage_percentage NUMERIC,
  can_upload BOOLEAN
) AS $$
DECLARE
  quota RECORD;
BEGIN
  -- Get or create quota record
  SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;

  IF NOT FOUND THEN
    INSERT INTO user_storage_quotas (user_id) VALUES (user_uuid);
    SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;
  END IF;

  RETURN QUERY SELECT
    quota.total_videos,
    quota.max_videos,
    quota.total_size_bytes,
    quota.max_size_bytes,
    ROUND(quota.total_size_bytes / 1024.0 / 1024.0, 2) as current_size_mb,
    ROUND(quota.max_size_bytes / 1024.0 / 1024.0, 2) as max_size_mb,
    ROUND((quota.total_videos::numeric / quota.max_videos::numeric) * 100, 1) as videos_percentage,
    ROUND((quota.total_size_bytes::numeric / quota.max_size_bytes::numeric) * 100, 1) as storage_percentage,
    can_user_upload_video(user_uuid, 0) as can_upload;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage_quotas ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES FOR USER_VIDEOS
-- ===========================================

-- Users can view their own videos
CREATE POLICY "Users can view own videos" ON user_videos
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos" ON user_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON user_videos
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own videos (soft delete)
CREATE POLICY "Users can delete own videos" ON user_videos
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- RLS POLICIES FOR USER_STORAGE_QUOTAS
-- ===========================================

-- Users can view their own quota
CREATE POLICY "Users can view own quota" ON user_storage_quotas
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own quota (for quota refresh)
CREATE POLICY "Users can update own quota" ON user_storage_quotas
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own quota
CREATE POLICY "Users can insert own quota" ON user_storage_quotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- VERIFICATION AND SAMPLE DATA
-- ===========================================

-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_videos') THEN
        RAISE NOTICE '✅ user_videos table created successfully';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_storage_quotas') THEN
        RAISE NOTICE '✅ user_storage_quotas table created successfully';
    END IF;

    RAISE NOTICE '🔒 RLS policies enabled for both tables';
    RAISE NOTICE '⚡ Triggers and functions created for automatic quota management';
    RAISE NOTICE '🔍 Indexes created for optimal query performance';
END $$;

-- Display table information
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('user_videos', 'user_storage_quotas')
ORDER BY table_name, ordinal_position;

-- Show created policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('user_videos', 'user_storage_quotas')
ORDER BY tablename, policyname;
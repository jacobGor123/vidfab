-- Add aspect ratio and narration support to Video Agent
-- Migration: add-aspect-ratio-narration
-- Created: 2025-12-15

-- 1. Add aspect_ratio and enable_narration to video_agent_projects
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(10) DEFAULT '16:9',
ADD COLUMN IF NOT EXISTS enable_narration BOOLEAN DEFAULT false;

-- 2. Add video generation task fields to project_video_clips
ALTER TABLE project_video_clips
ADD COLUMN IF NOT EXISTS video_request_id VARCHAR(255),  -- Wavespeed prediction ID
ADD COLUMN IF NOT EXISTS video_status VARCHAR(50) DEFAULT 'pending',  -- pending/generating/completed/failed
ADD COLUMN IF NOT EXISTS video_error TEXT;  -- Error information

-- 3. Add comments for better documentation
COMMENT ON COLUMN video_agent_projects.aspect_ratio IS 'Video aspect ratio: 16:9 (landscape) or 9:16 (portrait)';
COMMENT ON COLUMN video_agent_projects.enable_narration IS 'Whether to generate videos with voiceover narration using Veo 3.1';
COMMENT ON COLUMN project_video_clips.video_request_id IS 'Wavespeed API prediction/task ID for video generation';
COMMENT ON COLUMN project_video_clips.video_status IS 'Video generation status: pending, generating, completed, failed';
COMMENT ON COLUMN project_video_clips.video_error IS 'Error message if video generation failed';

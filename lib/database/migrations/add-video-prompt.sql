-- ===========================================
-- Migration: Add video_prompt to project_shots
-- Date: 2026-01-16
-- Purpose: 支持为每个分镜添加视频生成提示词
-- ===========================================

-- 添加 video_prompt 字段到 project_shots 表
ALTER TABLE project_shots 
ADD COLUMN IF NOT EXISTS video_prompt TEXT;

COMMENT ON COLUMN project_shots.video_prompt IS '视频生成提示词，用于控制该分镜视频的风格和动作';

-- 验证字段是否添加成功
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'project_shots' AND column_name = 'video_prompt';

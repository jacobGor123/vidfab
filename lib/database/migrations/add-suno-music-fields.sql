-- ==================================================
-- Migration: 添加 Suno AI 音乐生成相关字段
-- 日期: 2025-12-10
-- 描述: 为 video_agent_projects 表添加音乐生成提示词和任务ID字段
-- ==================================================

-- 添加音乐生成提示词字段
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS music_generation_prompt TEXT;

-- 添加 Suno 任务ID字段
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS suno_task_id VARCHAR(100);

-- 添加注释
COMMENT ON COLUMN video_agent_projects.music_generation_prompt IS 'Suno AI 音乐生成的提示词';
COMMENT ON COLUMN video_agent_projects.suno_task_id IS 'Suno AI 音乐生成任务的ID';

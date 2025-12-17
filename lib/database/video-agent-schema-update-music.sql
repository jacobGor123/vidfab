-- ==================================================
-- Video Agent - Music Generation Schema Update
-- 添加 Suno AI 音乐生成相关字段
-- ==================================================

-- 添加音乐生成提示词字段
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS music_generation_prompt TEXT;

-- 添加 Suno 任务 ID 字段
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS suno_task_id VARCHAR(255);

-- 添加注释
COMMENT ON COLUMN video_agent_projects.music_generation_prompt IS 'AI 音乐生成的提示词';
COMMENT ON COLUMN video_agent_projects.suno_task_id IS 'Suno API 返回的任务 ID';

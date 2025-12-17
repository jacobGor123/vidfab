-- ========================================================
-- Video Agent - 自然过渡优化数据库迁移
-- 添加首尾帧链式过渡、横竖屏、旁白模式、Suno 音乐等字段
-- ========================================================
--
-- 执行说明:
-- 1. 在 Supabase SQL Editor 或 psql 中执行此脚本
-- 2. 执行前请先备份数据库
-- 3. 此脚本使用 IF NOT EXISTS 保证幂等性，可重复执行
--
-- 执行命令（本地开发）:
-- psql -d your_database -f lib/database/migrations/add-last-frame-and-audio.sql
--
-- 执行命令（Supabase）:
-- 在 Supabase SQL Editor 中粘贴并执行
-- ========================================================

-- ========================================================
-- 1. project_video_clips 表 - 添加首尾帧字段
-- ========================================================

-- 添加 last_frame_url 字段（存储视频末尾帧 URL，用于链式过渡）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_video_clips'
    AND column_name = 'last_frame_url'
  ) THEN
    ALTER TABLE project_video_clips
    ADD COLUMN last_frame_url TEXT;

    COMMENT ON COLUMN project_video_clips.last_frame_url IS '视频末尾帧 URL，用于下一个片段的首帧链式过渡';
  END IF;
END $$;

-- 添加 last_frame_storage_path 字段（存储末尾帧的 Supabase Storage 路径）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_video_clips'
    AND column_name = 'last_frame_storage_path'
  ) THEN
    ALTER TABLE project_video_clips
    ADD COLUMN last_frame_storage_path TEXT;

    COMMENT ON COLUMN project_video_clips.last_frame_storage_path IS '视频末尾帧的 Supabase Storage 路径';
  END IF;
END $$;

-- 添加 video_request_id 字段（用于存储 Veo3 等第三方 API 的 request ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_video_clips'
    AND column_name = 'video_request_id'
  ) THEN
    ALTER TABLE project_video_clips
    ADD COLUMN video_request_id VARCHAR(100);

    COMMENT ON COLUMN project_video_clips.video_request_id IS '第三方视频生成服务的 request ID（如 Veo3 Wavespeed prediction ID）';
  END IF;
END $$;

-- 添加 video_status 字段（用于存储第三方 API 的生成状态）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_video_clips'
    AND column_name = 'video_status'
  ) THEN
    ALTER TABLE project_video_clips
    ADD COLUMN video_status VARCHAR(20);

    COMMENT ON COLUMN project_video_clips.video_status IS '第三方视频生成服务的状态（processing/completed/failed）';
  END IF;
END $$;

-- ========================================================
-- 2. video_agent_projects 表 - 添加横竖屏和旁白模式字段
-- ========================================================

-- 添加 aspect_ratio 字段（横竖屏比例）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'aspect_ratio'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN aspect_ratio VARCHAR(10) DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16'));

    COMMENT ON COLUMN video_agent_projects.aspect_ratio IS '视频宽高比：16:9 横屏 / 9:16 竖屏';
  END IF;
END $$;

-- 添加 enable_narration 字段（启用旁白模式）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'enable_narration'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN enable_narration BOOLEAN DEFAULT false;

    COMMENT ON COLUMN video_agent_projects.enable_narration IS '是否启用旁白模式（true: Veo3.1 + Doubao TTS + 字幕 / false: Seedance + Suno 背景音乐）';
  END IF;
END $$;

-- ========================================================
-- 3. video_agent_projects 表 - 添加 Suno 音乐生成字段
-- ========================================================

-- 添加 suno_task_id 字段（Suno 任务 ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'suno_task_id'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN suno_task_id VARCHAR(100);

    COMMENT ON COLUMN video_agent_projects.suno_task_id IS 'Suno AI 音乐生成任务 ID（KIE API taskId）';
  END IF;
END $$;

-- 添加 suno_prompt 字段（Suno 音乐生成 prompt）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'suno_prompt'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN suno_prompt TEXT;

    COMMENT ON COLUMN video_agent_projects.suno_prompt IS 'Suno 音乐生成的 prompt（由 LLM 在脚本分析时生成）';
  END IF;
END $$;

-- 添加 suno_status 字段（Suno 生成状态）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'suno_status'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN suno_status VARCHAR(20) CHECK (suno_status IN ('submitted', 'processing', 'completed', 'failed'));

    COMMENT ON COLUMN video_agent_projects.suno_status IS 'Suno 音乐生成状态（submitted/processing/completed/failed）';
  END IF;
END $$;

-- 添加 suno_error_message 字段（Suno 失败错误信息）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_agent_projects'
    AND column_name = 'suno_error_message'
  ) THEN
    ALTER TABLE video_agent_projects
    ADD COLUMN suno_error_message TEXT;

    COMMENT ON COLUMN video_agent_projects.suno_error_message IS 'Suno 音乐生成失败时的错误信息';
  END IF;
END $$;

-- ========================================================
-- 4. 索引优化
-- ========================================================

-- 为 video_request_id 创建索引（用于状态查询）
CREATE INDEX IF NOT EXISTS idx_project_video_clips_video_request_id
  ON project_video_clips(video_request_id)
  WHERE video_request_id IS NOT NULL;

-- 为 suno_task_id 创建索引（用于状态查询）
CREATE INDEX IF NOT EXISTS idx_video_agent_projects_suno_task_id
  ON video_agent_projects(suno_task_id)
  WHERE suno_task_id IS NOT NULL;

-- 为 enable_narration 创建索引（用于统计查询）
CREATE INDEX IF NOT EXISTS idx_video_agent_projects_enable_narration
  ON video_agent_projects(enable_narration);

-- ========================================================
-- 5. 验证查询
-- ========================================================

-- 验证 project_video_clips 表字段
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'project_video_clips'
  AND column_name IN (
    'last_frame_url',
    'last_frame_storage_path',
    'video_request_id',
    'video_status'
  )
ORDER BY column_name;

-- 验证 video_agent_projects 表字段
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'video_agent_projects'
  AND column_name IN (
    'aspect_ratio',
    'enable_narration',
    'suno_task_id',
    'suno_prompt',
    'suno_status',
    'suno_error_message'
  )
ORDER BY column_name;

-- ========================================================
-- 迁移完成
-- ========================================================

-- 打印成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库迁移完成！';
  RAISE NOTICE '已添加以下功能支持:';
  RAISE NOTICE '  - 首尾帧链式过渡 (last_frame_url)';
  RAISE NOTICE '  - 横竖屏比例 (aspect_ratio)';
  RAISE NOTICE '  - 旁白模式 (enable_narration)';
  RAISE NOTICE '  - Suno 音乐生成 (suno_task_id, suno_prompt, suno_status)';
  RAISE NOTICE '';
  RAISE NOTICE '请查看上方验证查询结果，确认所有字段已正确添加。';
END $$;

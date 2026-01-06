-- ==================================================
-- Migration: 修改 duration 约束以支持 YouTube 视频复刻模式
--
-- 原约束: duration IN (15, 30, 45, 60)
-- 新约束: duration BETWEEN 1 AND 120
--
-- 执行说明:
-- 1. 在 Supabase SQL Editor 中执行此脚本
-- 2. 此操作会修改现有表的约束
-- 3. 不影响现有数据
-- ==================================================

-- 删除旧的 CHECK 约束
ALTER TABLE video_agent_projects
DROP CONSTRAINT IF EXISTS video_agent_projects_duration_check;

-- 添加新的 CHECK 约束（允许 1-120 秒的任意整数，支持最长 2 分钟视频）
ALTER TABLE video_agent_projects
ADD CONSTRAINT video_agent_projects_duration_check
CHECK (duration >= 1 AND duration <= 120);

-- 验证约束
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'video_agent_projects'::regclass
AND conname = 'video_agent_projects_duration_check';

-- ==================================================
-- Migration 完成
-- ==================================================

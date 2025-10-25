-- ================================================================
-- 清理未使用的任务表
-- ================================================================
-- 这些表在数据库中存在但从未使用过，所有任务实际存储在 user_videos 表中
-- 执行此脚本将删除这些空表以简化数据库结构
-- ================================================================

-- 删除 6 个未使用的任务表
DROP TABLE IF EXISTS video_generation_tasks CASCADE;
DROP TABLE IF EXISTS audio_generation_tasks CASCADE;
DROP TABLE IF EXISTS watermark_removal_tasks CASCADE;
DROP TABLE IF EXISTS video_upscaler_tasks CASCADE;
DROP TABLE IF EXISTS video_effect_tasks CASCADE;
DROP TABLE IF EXISTS video_face_swap_tasks CASCADE;

-- 验证删除结果
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%task%'
ORDER BY table_name;

-- 应该只剩下 user_videos 表（如果有其他 task 相关表的话）

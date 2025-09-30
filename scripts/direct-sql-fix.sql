-- 直接SQL修复脚本
-- 修复file_size字段中的字符串"null"值

-- 首先检查有多少记录
SELECT COUNT(*) as total_videos FROM user_videos;

-- 检查file_size字段的数据类型和值
SELECT
  id,
  file_size,
  pg_typeof(file_size) as file_size_type,
  status
FROM user_videos
WHERE status = 'completed'
LIMIT 10;

-- 尝试修复字符串"null"值（如果存在的话）
-- 注意：这需要根据实际的数据类型调整
UPDATE user_videos
SET file_size = NULL
WHERE file_size::text = 'null' AND status = 'completed';

-- 验证修复结果
SELECT
  user_id,
  COUNT(*) as video_count,
  SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END) as total_size_bytes,
  ROUND(SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END) / 1024.0 / 1024.0, 2) as total_size_mb
FROM user_videos
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(*) > 0;
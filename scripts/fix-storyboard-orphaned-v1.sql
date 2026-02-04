-- 修复孤立的 version=1 记录
-- 问题：批量生成时错误地创建了 version=2，导致 version=1 为空

-- 1. 删除所有 version=1 且 image_url 为空的记录
DELETE FROM project_storyboards
WHERE version = 1
  AND (image_url IS NULL OR image_url = '')
  AND NOT is_current;

-- 2. 如果 version=1 有图但不是 current，且 version=2 是 current，删除 version=1
DELETE FROM project_storyboards ps1
WHERE ps1.version = 1
  AND NOT ps1.is_current
  AND EXISTS (
    SELECT 1 FROM project_storyboards ps2
    WHERE ps2.project_id = ps1.project_id
      AND ps2.shot_number = ps1.shot_number
      AND ps2.version = 2
      AND ps2.is_current = true
  );

-- 3. 验证：查看每个分镜的当前版本
SELECT 
  project_id,
  shot_number,
  version,
  is_current,
  status,
  image_url IS NOT NULL as has_image
FROM project_storyboards
WHERE is_current = true
ORDER BY project_id, shot_number;

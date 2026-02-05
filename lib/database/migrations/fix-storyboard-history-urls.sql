-- ==================================================
-- 修复：save_storyboard_with_history 函数缺少关键字段
-- 问题：新版本只保存了 image_url，但没有保存 image_url_external 和 storage_status
-- 导致：主图和预览图加载失败（resolveStoryboardSrc 无法正确解析 URL）
-- ==================================================

-- 🔥 先删除旧函数（避免函数签名冲突）
DROP FUNCTION IF EXISTS save_storyboard_with_history(UUID, INT, TEXT, TEXT, VARCHAR(100));

-- 修改函数：增加 image_url_external 和 storage_status 参数
CREATE OR REPLACE FUNCTION save_storyboard_with_history(
  p_project_id UUID,
  p_shot_number INT,
  p_image_url TEXT,
  p_image_storage_path TEXT DEFAULT NULL,
  p_seedream_task_id VARCHAR(100) DEFAULT NULL,
  p_image_url_external TEXT DEFAULT NULL,
  p_storage_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  v_new_version INT;
  v_new_id UUID;
  v_version_count INT;
  v_oldest_version INT;
BEGIN
  -- 获取下一个版本号
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_new_version
  FROM project_storyboards
  WHERE project_id = p_project_id
    AND shot_number = p_shot_number;

  -- 将当前版本标记为非当前
  UPDATE project_storyboards
  SET is_current = false
  WHERE project_id = p_project_id
    AND shot_number = p_shot_number
    AND is_current = true;

  -- 插入新版本（增加 image_url_external 和 storage_status）
  INSERT INTO project_storyboards (
    project_id,
    shot_number,
    image_url,
    image_url_external,
    image_storage_path,
    seedream_task_id,
    storage_status,
    version,
    is_current,
    status,
    generation_attempts
  )
  VALUES (
    p_project_id,
    p_shot_number,
    p_image_url,
    p_image_url_external,
    p_image_storage_path,
    p_seedream_task_id,
    p_storage_status,
    v_new_version,
    true,
    'success',
    1
  )
  RETURNING id INTO v_new_id;

  -- 检查版本数量，超过20个则删除最旧的
  SELECT COUNT(*), MIN(version)
  INTO v_version_count, v_oldest_version
  FROM project_storyboards
  WHERE project_id = p_project_id
    AND shot_number = p_shot_number;

  IF v_version_count > 20 THEN
    DELETE FROM project_storyboards
    WHERE project_id = p_project_id
      AND shot_number = p_shot_number
      AND version = v_oldest_version;
  END IF;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION save_storyboard_with_history IS '保存分镜图新版本并自动管理历史记录（最多20个），包含完整的 URL 和存储状态字段';

-- ==================================================
-- 修复完成
-- 使用方法：
-- SELECT * FROM save_storyboard_with_history(
--   'project-uuid',
--   1,
--   'https://cdn.example.com/image.jpg',
--   '/storage/path/image.jpg',
--   'task-123',
--   'https://external.seedream.com/signed-url',
--   'pending'
-- );
-- ==================================================

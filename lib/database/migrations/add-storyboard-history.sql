-- ==================================================
-- 迁移脚本：添加分镜图历史版本支持
-- 功能：
-- 1. 保存每次重新生成的分镜图（最多20个历史版本）
-- 2. 标记当前使用的版本
-- 3. 自动删除超出限制的旧版本
-- ==================================================

-- 1. 修改 project_storyboards 表：添加版本控制字段
ALTER TABLE project_storyboards
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

-- 2. 删除旧的唯一约束（project_id, shot_number）
ALTER TABLE project_storyboards
  DROP CONSTRAINT IF EXISTS unique_storyboard_per_shot;

-- 3. 添加新的唯一约束（project_id, shot_number, version）
ALTER TABLE project_storyboards
  ADD CONSTRAINT unique_storyboard_version
  UNIQUE (project_id, shot_number, version);

-- 4. 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_project_storyboards_current
  ON project_storyboards(project_id, shot_number, is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_project_storyboards_version
  ON project_storyboards(project_id, shot_number, version DESC);

-- 5. 创建函数：保存新版本并管理历史记录（最多20个）
CREATE OR REPLACE FUNCTION save_storyboard_with_history(
  p_project_id UUID,
  p_shot_number INT,
  p_image_url TEXT,
  p_image_storage_path TEXT,
  p_seedream_task_id VARCHAR(100)
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

  -- 插入新版本
  INSERT INTO project_storyboards (
    project_id,
    shot_number,
    image_url,
    image_storage_path,
    seedream_task_id,
    version,
    is_current,
    status,
    generation_attempts
  )
  VALUES (
    p_project_id,
    p_shot_number,
    p_image_url,
    p_image_storage_path,
    p_seedream_task_id,
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

COMMENT ON FUNCTION save_storyboard_with_history IS '保存分镜图新版本并自动管理历史记录（最多20个）';

-- 6. 创建函数：获取分镜图历史版本列表
CREATE OR REPLACE FUNCTION get_storyboard_history(
  p_project_id UUID,
  p_shot_number INT
)
RETURNS TABLE (
  id UUID,
  version INT,
  image_url TEXT,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.version,
    ps.image_url,
    ps.is_current,
    ps.created_at
  FROM project_storyboards ps
  WHERE ps.project_id = p_project_id
    AND ps.shot_number = p_shot_number
    AND ps.status = 'success'
  ORDER BY ps.version DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_storyboard_history IS '获取指定分镜的所有历史版本（按版本号倒序）';

-- 7. 创建函数：切换到指定历史版本
CREATE OR REPLACE FUNCTION switch_to_storyboard_version(
  p_project_id UUID,
  p_shot_number INT,
  p_version INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- 检查目标版本是否存在
  SELECT EXISTS(
    SELECT 1
    FROM project_storyboards
    WHERE project_id = p_project_id
      AND shot_number = p_shot_number
      AND version = p_version
      AND status = 'success'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN false;
  END IF;

  -- 将所有版本标记为非当前
  UPDATE project_storyboards
  SET is_current = false
  WHERE project_id = p_project_id
    AND shot_number = p_shot_number;

  -- 将指定版本标记为当前
  UPDATE project_storyboards
  SET is_current = true
  WHERE project_id = p_project_id
    AND shot_number = p_shot_number
    AND version = p_version;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION switch_to_storyboard_version IS '切换到指定的历史版本';

-- ==================================================
-- 迁移完成
-- ==================================================

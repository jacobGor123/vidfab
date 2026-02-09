-- ==================================================
-- 修复：get_storyboard_history 函数缺少关键 URL 字段
-- 问题：历史版本查询只返回 image_url，缺少 image_url_external, cdn_url, storage_status
-- 导致：前端无法正确解析历史版本的图片 URL
-- ==================================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_storyboard_history(UUID, INT);

-- 重新创建函数，返回完整 URL 字段
CREATE OR REPLACE FUNCTION get_storyboard_history(
  p_project_id UUID,
  p_shot_number INT
)
RETURNS TABLE (
  id UUID,
  version INT,
  image_url TEXT,
  image_url_external TEXT,
  cdn_url TEXT,
  image_storage_path TEXT,
  storage_status TEXT,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.version,
    ps.image_url,
    ps.image_url_external,
    ps.cdn_url,
    ps.image_storage_path,
    ps.storage_status,
    ps.is_current,
    ps.created_at
  FROM project_storyboards ps
  WHERE ps.project_id = p_project_id
    AND ps.shot_number = p_shot_number
    AND ps.status = 'success'
  ORDER BY ps.version DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_storyboard_history IS '获取指定分镜的所有历史版本，包含完整的 URL 字段（按版本号倒序）';

-- ==================================================
-- 修复完成
-- 历史版本查询现在返回：
-- - image_url: 当前可用的主 URL
-- - image_url_external: 外部签名 URL（来自 BytePlus）
-- - cdn_url: Supabase CDN URL（永久存储）
-- - image_storage_path: Supabase Storage 路径
-- - storage_status: 存储状态（pending/completed/failed）
-- ==================================================

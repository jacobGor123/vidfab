-- ===========================================
-- VidFab AI Video Platform
-- 存储配额修复和增强脚本
-- ===========================================
-- 修复存储配额设置为：订阅用户1GB，普通用户100MB
-- 添加自动删除旧视频的功能
-- ===========================================

-- 更新用户存储配额表的默认值
ALTER TABLE user_storage_quotas
ALTER COLUMN max_size_bytes SET DEFAULT 104857600; -- 100MB for free users

-- 更新现有免费用户的配额
UPDATE user_storage_quotas
SET max_size_bytes = 104857600  -- 100MB
WHERE plan_type = 'free';

-- 更新订阅用户的配额
UPDATE user_storage_quotas
SET max_size_bytes = 1073741824  -- 1GB
WHERE plan_type IN ('pro', 'enterprise');

-- ===========================================
-- 用户订阅状态检查功能
-- ===========================================

-- 检查用户是否为订阅用户的函数
CREATE OR REPLACE FUNCTION is_user_subscribed(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 从users表获取订阅状态
  SELECT subscription_status, subscription_plan
  FROM users
  WHERE uuid = user_uuid
  INTO user_record;

  -- 如果找不到用户，返回false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 检查是否为活跃订阅
  RETURN (user_record.subscription_status = 'active'
          AND user_record.subscription_plan IN ('pro', 'enterprise'));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 获取用户存储限制的函数
-- ===========================================

-- 根据用户订阅状态获取存储限制
CREATE OR REPLACE FUNCTION get_user_storage_limit(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  -- 如果是订阅用户，返回1GB
  IF is_user_subscribed(user_uuid) THEN
    RETURN 1073741824; -- 1GB
  ELSE
    RETURN 104857600;  -- 100MB
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 自动删除旧视频的函数
-- ===========================================

-- 当用户存储超限时，自动删除最旧的视频
CREATE OR REPLACE FUNCTION auto_delete_old_videos(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  storage_limit BIGINT;
  current_usage BIGINT;
  videos_to_delete RECORD;
  deleted_count INTEGER := 0;
  deleted_size BIGINT := 0;
BEGIN
  -- 获取用户存储限制
  storage_limit := get_user_storage_limit(user_uuid);

  -- 获取当前存储使用量
  SELECT COALESCE(total_size_bytes, 0)
  FROM user_storage_quotas
  WHERE user_id = user_uuid
  INTO current_usage;

  -- 如果未超限，无需删除
  IF current_usage <= storage_limit THEN
    RETURN 0;
  END IF;

  RAISE NOTICE '用户 % 存储超限: %MB / %MB，开始自动删除旧视频',
    user_uuid,
    ROUND(current_usage / 1024.0 / 1024.0, 2),
    ROUND(storage_limit / 1024.0 / 1024.0, 2);

  -- 删除最旧的非收藏视频，直到存储使用量降到限制以下
  FOR videos_to_delete IN
    SELECT id, file_size, prompt, created_at
    FROM user_videos
    WHERE user_id = user_uuid
      AND status = 'completed'
      AND is_favorite = FALSE
    ORDER BY created_at ASC -- 最旧的优先
  LOOP
    -- 软删除视频（更新状态为deleted）
    UPDATE user_videos
    SET status = 'deleted', updated_at = NOW()
    WHERE id = videos_to_delete.id;

    deleted_count := deleted_count + 1;
    deleted_size := deleted_size + COALESCE(videos_to_delete.file_size, 0);

    RAISE NOTICE '删除视频: % (大小: %MB, 创建时间: %)',
      videos_to_delete.prompt,
      ROUND(COALESCE(videos_to_delete.file_size, 0) / 1024.0 / 1024.0, 2),
      videos_to_delete.created_at;

    -- 重新计算当前使用量
    SELECT COALESCE(total_size_bytes, 0)
    FROM user_storage_quotas
    WHERE user_id = user_uuid
    INTO current_usage;

    -- 如果已降到限制以下，停止删除
    IF current_usage <= storage_limit THEN
      EXIT;
    END IF;
  END LOOP;

  RAISE NOTICE '自动删除完成: 删除了 % 个视频，释放了 %MB 存储空间',
    deleted_count,
    ROUND(deleted_size / 1024.0 / 1024.0, 2);

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 更新配额管理触发器
-- ===========================================

-- 增强的配额更新函数，包含自动删除功能
CREATE OR REPLACE FUNCTION update_user_quota_with_auto_cleanup()
RETURNS TRIGGER AS $$
DECLARE
  storage_limit BIGINT;
  current_usage BIGINT;
BEGIN
  -- Handle INSERT: video status changed to 'completed'
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    INSERT INTO user_storage_quotas (user_id, total_videos, total_size_bytes)
    VALUES (NEW.user_id, 1, COALESCE(NEW.file_size, 0))
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_videos = user_storage_quotas.total_videos + 1,
      total_size_bytes = user_storage_quotas.total_size_bytes + COALESCE(NEW.file_size, 0),
      updated_at = NOW();

  -- Handle UPDATE: status changed from non-completed to completed
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO user_storage_quotas (user_id, total_videos, total_size_bytes)
    VALUES (NEW.user_id, 1, COALESCE(NEW.file_size, 0))
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_videos = user_storage_quotas.total_videos + 1,
      total_size_bytes = user_storage_quotas.total_size_bytes + COALESCE(NEW.file_size, 0),
      updated_at = NOW();

  -- Handle UPDATE: status changed from completed to non-completed or deleted
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE user_storage_quotas
    SET
      total_videos = GREATEST(0, total_videos - 1),
      total_size_bytes = GREATEST(0, total_size_bytes - COALESCE(OLD.file_size, 0)),
      updated_at = NOW()
    WHERE user_id = OLD.user_id;

  -- Handle DELETE: remove completed video from quota
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    UPDATE user_storage_quotas
    SET
      total_videos = GREATEST(0, total_videos - 1),
      total_size_bytes = GREATEST(0, total_size_bytes - COALESCE(OLD.file_size, 0)),
      updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;

  -- 在视频添加完成后，检查是否需要自动删除旧视频
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'completed' THEN
    -- 获取用户存储限制
    storage_limit := get_user_storage_limit(NEW.user_id);

    -- 获取当前存储使用量
    SELECT COALESCE(total_size_bytes, 0)
    FROM user_storage_quotas
    WHERE user_id = NEW.user_id
    INTO current_usage;

    -- 如果超限，自动删除旧视频
    IF current_usage > storage_limit THEN
      PERFORM auto_delete_old_videos(NEW.user_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 重新创建触发器
DROP TRIGGER IF EXISTS trigger_update_user_quota ON user_videos;
CREATE TRIGGER trigger_update_user_quota
  AFTER INSERT OR UPDATE OR DELETE ON user_videos
  FOR EACH ROW EXECUTE FUNCTION update_user_quota_with_auto_cleanup();

-- ===========================================
-- 更新配额查询函数
-- ===========================================

-- 增强的用户配额查询函数
CREATE OR REPLACE FUNCTION get_user_quota(user_uuid UUID)
RETURNS TABLE(
  current_videos INTEGER,
  max_videos INTEGER,
  current_size_bytes BIGINT,
  max_size_bytes BIGINT,
  current_size_mb NUMERIC,
  max_size_mb NUMERIC,
  videos_percentage NUMERIC,
  storage_percentage NUMERIC,
  can_upload BOOLEAN,
  is_subscribed BOOLEAN
) AS $$
DECLARE
  quota RECORD;
  user_storage_limit BIGINT;
  user_is_subscribed BOOLEAN;
BEGIN
  -- 检查用户订阅状态
  user_is_subscribed := is_user_subscribed(user_uuid);

  -- 获取用户存储限制
  user_storage_limit := get_user_storage_limit(user_uuid);

  -- 获取或创建配额记录
  SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;

  IF NOT FOUND THEN
    INSERT INTO user_storage_quotas (
      user_id,
      max_size_bytes,
      plan_type
    ) VALUES (
      user_uuid,
      user_storage_limit,
      CASE WHEN user_is_subscribed THEN 'pro' ELSE 'free' END
    );
    SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;
  ELSE
    -- 更新配额限制以反映当前订阅状态
    UPDATE user_storage_quotas
    SET
      max_size_bytes = user_storage_limit,
      plan_type = CASE WHEN user_is_subscribed THEN 'pro' ELSE 'free' END,
      updated_at = NOW()
    WHERE user_id = user_uuid;

    -- 重新获取更新后的配额
    SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;
  END IF;

  RETURN QUERY SELECT
    quota.total_videos,
    quota.max_videos,
    quota.total_size_bytes,
    quota.max_size_bytes,
    ROUND(quota.total_size_bytes / 1024.0 / 1024.0, 2) as current_size_mb,
    ROUND(quota.max_size_bytes / 1024.0 / 1024.0, 2) as max_size_mb,
    ROUND((quota.total_videos::numeric / quota.max_videos::numeric) * 100, 1) as videos_percentage,
    ROUND((quota.total_size_bytes::numeric / quota.max_size_bytes::numeric) * 100, 1) as storage_percentage,
    can_user_upload_video(user_uuid, 0) as can_upload,
    user_is_subscribed as is_subscribed;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 更新上传检查函数
-- ===========================================

-- 增强的上传检查函数
CREATE OR REPLACE FUNCTION can_user_upload_video(user_uuid UUID, estimated_size BIGINT DEFAULT 0)
RETURNS BOOLEAN AS $$
DECLARE
  quota RECORD;
  storage_limit BIGINT;
BEGIN
  -- 获取用户存储限制
  storage_limit := get_user_storage_limit(user_uuid);

  -- 获取用户当前配额
  SELECT * FROM user_storage_quotas WHERE user_id = user_uuid INTO quota;

  -- 如果没有配额记录，创建一个
  IF NOT FOUND THEN
    INSERT INTO user_storage_quotas (
      user_id,
      max_size_bytes,
      plan_type
    ) VALUES (
      user_uuid,
      storage_limit,
      CASE WHEN is_user_subscribed(user_uuid) THEN 'pro' ELSE 'free' END
    );
    RETURN TRUE;
  END IF;

  -- 检查视频数量限制
  IF quota.total_videos >= quota.max_videos THEN
    RETURN FALSE;
  END IF;

  -- 检查存储大小限制
  IF (quota.total_size_bytes + estimated_size) > storage_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 手动清理函数
-- ===========================================

-- 手动清理特定用户的存储空间
CREATE OR REPLACE FUNCTION manual_cleanup_user_storage(user_uuid UUID, target_size_mb NUMERIC DEFAULT NULL)
RETURNS TABLE(
  deleted_videos INTEGER,
  freed_size_mb NUMERIC,
  remaining_size_mb NUMERIC
) AS $$
DECLARE
  target_bytes BIGINT;
  current_usage BIGINT;
  storage_limit BIGINT;
  deleted_count INTEGER;
  deleted_size BIGINT;
BEGIN
  -- 如果未指定目标大小，使用用户的存储限制
  IF target_size_mb IS NULL THEN
    storage_limit := get_user_storage_limit(user_uuid);
    target_bytes := storage_limit;
  ELSE
    target_bytes := (target_size_mb * 1024 * 1024)::BIGINT;
  END IF;

  -- 获取当前使用量
  SELECT COALESCE(total_size_bytes, 0)
  FROM user_storage_quotas
  WHERE user_id = user_uuid
  INTO current_usage;

  -- 如果当前使用量已经低于目标，无需清理
  IF current_usage <= target_bytes THEN
    RETURN QUERY SELECT
      0 as deleted_videos,
      0.0 as freed_size_mb,
      ROUND(current_usage / 1024.0 / 1024.0, 2) as remaining_size_mb;
    RETURN;
  END IF;

  -- 执行自动删除
  deleted_count := auto_delete_old_videos(user_uuid);

  -- 计算释放的空间
  deleted_size := current_usage - COALESCE((
    SELECT total_size_bytes
    FROM user_storage_quotas
    WHERE user_id = user_uuid
  ), 0);

  -- 获取当前使用量
  SELECT COALESCE(total_size_bytes, 0)
  FROM user_storage_quotas
  WHERE user_id = user_uuid
  INTO current_usage;

  RETURN QUERY SELECT
    deleted_count as deleted_videos,
    ROUND(deleted_size / 1024.0 / 1024.0, 2) as freed_size_mb,
    ROUND(current_usage / 1024.0 / 1024.0, 2) as remaining_size_mb;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 验证和通知
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '✅ 存储配额更新完成:';
    RAISE NOTICE '   - 普通用户: 100MB 存储限制';
    RAISE NOTICE '   - 订阅用户: 1GB 存储限制';
    RAISE NOTICE '   - 自动删除旧视频功能已启用';
    RAISE NOTICE '   - 配额管理触发器已更新';
    RAISE NOTICE '   - 可使用 manual_cleanup_user_storage(user_uuid) 手动清理';
END $$;
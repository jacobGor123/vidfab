-- =====================================================
-- 资产 7 天回收站机制 — 给 user_videos / user_images 加 deleted_at
-- 对应 PDF 第 4 部分需求 / discuss/2026-05-16-assets-retention-current-state.md
--
-- 软删流程：status='deleted' + deleted_at=NOW()
-- 凌晨 cron 扫 deleted_at < NOW() - 7 days 的，物理删 S3 + 数据库行
-- =====================================================

-- user_videos
ALTER TABLE user_videos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- user_images
ALTER TABLE user_images
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 回填：现有 status='deleted' 但 deleted_at 为 NULL 的记录 → 用 updated_at 充当
-- （这部分历史数据下次 cron 跑就会被清理）
UPDATE user_videos
SET deleted_at = updated_at
WHERE status = 'deleted' AND deleted_at IS NULL;

UPDATE user_images
SET deleted_at = updated_at
WHERE status = 'deleted' AND deleted_at IS NULL;

-- 索引：cron 扫描 deleted_at 是主用例
CREATE INDEX IF NOT EXISTS idx_user_videos_deleted_at
  ON user_videos(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_images_deleted_at
  ON user_images(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN user_videos.deleted_at IS '软删时间。7 天后凌晨 cron 物理删 S3 + 数据库行';
COMMENT ON COLUMN user_images.deleted_at IS '软删时间。7 天后凌晨 cron 物理删 S3 + 数据库行';

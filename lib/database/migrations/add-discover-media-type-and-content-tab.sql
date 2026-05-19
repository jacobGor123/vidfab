-- =====================================================
-- Discover Videos: 新增 media_type + content_tab 字段
-- 用于 Discover 页面改版（PDF 第 2 部分）：
--   1. 顶部图片/视频切换 → media_type
--   2. 内容专区 tab (product demo / entertainment) → content_tab
-- 兼容策略：
--   - 已有数据全部置为默认值 (video / entertainment)
--   - content_tab 用 VARCHAR 而非 ENUM，方便后续扩展（"更多以后再说"）
-- =====================================================

-- 1. media_type
ALTER TABLE discover_videos
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'video';

ALTER TABLE discover_videos
  DROP CONSTRAINT IF EXISTS valid_media_type;
ALTER TABLE discover_videos
  ADD CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video'));

-- 2. content_tab
ALTER TABLE discover_videos
  ADD COLUMN IF NOT EXISTS content_tab VARCHAR(40) NOT NULL DEFAULT 'entertainment';

ALTER TABLE discover_videos
  DROP CONSTRAINT IF EXISTS valid_content_tab;
ALTER TABLE discover_videos
  ADD CONSTRAINT valid_content_tab CHECK (content_tab IN ('entertainment', 'product_demo'));

-- 3. 查询索引（按 tab + media + status 组合过滤是主用例）
CREATE INDEX IF NOT EXISTS idx_discover_videos_tab_media_status
  ON discover_videos(content_tab, media_type, status);

-- 4. 注释
COMMENT ON COLUMN discover_videos.media_type IS '资源类型：image (image_url 主展示) 或 video (video_url 主展示)';
COMMENT ON COLUMN discover_videos.content_tab IS '内容专区分类：entertainment 或 product_demo，前端 Discover 页 tab 切换';

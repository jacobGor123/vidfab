-- =====================================================
-- Discover Videos Table Schema
-- 用于存储 Discover 页面展示的视频数据
-- 创建时间: 2025-10-31
-- =====================================================

-- 创建 discover_videos 表
CREATE TABLE IF NOT EXISTS discover_videos (
  -- 主键
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 核心内容
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  image_url TEXT,  -- 可选，用作缩略图/poster

  -- 分类和排序
  category VARCHAR(50) DEFAULT 'abstract',
  display_order INTEGER DEFAULT 0,

  -- 状态管理
  status VARCHAR(20) DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,

  -- 审计字段
  created_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_category CHECK (category IN (
    'portrait', 'nature', 'fantasy', 'lifestyle',
    'abstract', 'cinematic', 'technology', 'vehicles'
  )),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'draft'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_discover_videos_category ON discover_videos(category);
CREATE INDEX IF NOT EXISTS idx_discover_videos_status ON discover_videos(status);
CREATE INDEX IF NOT EXISTS idx_discover_videos_display_order ON discover_videos(display_order DESC);
CREATE INDEX IF NOT EXISTS idx_discover_videos_created_at ON discover_videos(created_at DESC);

-- 创建更新时间自动更新触发器
CREATE OR REPLACE FUNCTION update_discover_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_discover_videos_updated_at
  BEFORE UPDATE ON discover_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_discover_videos_updated_at();

-- 添加表注释
COMMENT ON TABLE discover_videos IS 'Discover 页面展示的视频数据';
COMMENT ON COLUMN discover_videos.prompt IS '视频描述/提示词';
COMMENT ON COLUMN discover_videos.video_url IS '视频 CDN URL（S3）';
COMMENT ON COLUMN discover_videos.image_url IS '缩略图 URL，为空时可自动从视频生成';
COMMENT ON COLUMN discover_videos.category IS '分类：portrait/nature/fantasy/lifestyle/abstract/cinematic/technology/vehicles';
COMMENT ON COLUMN discover_videos.display_order IS '排序权重，数字越大越靠前';
COMMENT ON COLUMN discover_videos.status IS '状态：active/inactive/draft';
COMMENT ON COLUMN discover_videos.is_featured IS '是否精选展示';
COMMENT ON COLUMN discover_videos.created_by IS '创建者（管理员）UUID';

-- ============================================
-- VidFab Blog System - Database Schema
-- ============================================
-- 创建日期: 2025-12-03
-- 说明: 博客系统的数据库表结构
-- ============================================

-- 博客文章表
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基础信息
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,

  -- SEO 相关
  meta_title VARCHAR(255),
  meta_description VARCHAR(320),
  keywords TEXT[], -- PostgreSQL 数组类型

  -- 分类和标签
  category VARCHAR(50),
  tags TEXT[],

  -- 状态管理
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- 统计数据
  view_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER,

  -- 内容结构 (JSON 格式)
  table_of_contents JSONB,
  faq_schema JSONB,

  -- 作者信息
  author_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_uuid);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- 创建 GIN 索引用于全文搜索和数组字段
CREATE INDEX IF NOT EXISTS idx_blog_posts_keywords ON blog_posts USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);

-- 博客图片表 (用于管理文章配图)
CREATE TABLE IF NOT EXISTS blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- 图片信息
  image_url TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,

  -- 排序
  display_order INTEGER DEFAULT 0,

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 图片表索引
CREATE INDEX IF NOT EXISTS idx_blog_images_post_id ON blog_images(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_images_order ON blog_images(post_id, display_order);

-- 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- 添加注释
COMMENT ON TABLE blog_posts IS '博客文章主表';
COMMENT ON COLUMN blog_posts.slug IS 'URL 友好的唯一标识符';
COMMENT ON COLUMN blog_posts.content IS 'HTML 格式的文章内容';
COMMENT ON COLUMN blog_posts.status IS '文章状态: draft(草稿), scheduled(定时发布), published(已发布)';
COMMENT ON COLUMN blog_posts.table_of_contents IS 'JSON 格式的文章目录';
COMMENT ON COLUMN blog_posts.faq_schema IS 'JSON 格式的 FAQ Schema 数据';

COMMENT ON TABLE blog_images IS '博客文章配图表';
COMMENT ON COLUMN blog_images.display_order IS '图片在文章中的显示顺序';

-- 插入示例数据 (可选,仅用于开发测试)
-- INSERT INTO blog_posts (
--   title,
--   slug,
--   content,
--   excerpt,
--   category,
--   tags,
--   status,
--   meta_title,
--   meta_description,
--   keywords
-- ) VALUES (
--   'Welcome to VidFab Blog',
--   'welcome-to-vidfab-blog',
--   '<h2>Introduction</h2><p>This is a sample blog post...</p>',
--   'Welcome to our new blog!',
--   'announcements',
--   ARRAY['welcome', 'announcement'],
--   'published',
--   'Welcome to VidFab Blog - AI Video Generation',
--   'Discover the latest in AI video generation technology and tips.',
--   ARRAY['ai video', 'video generation', 'vidfab']
-- );

-- =====================================================
-- Database Functions
-- =====================================================

-- Function: Increment blog post view count
CREATE OR REPLACE FUNCTION increment_blog_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

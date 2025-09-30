-- 初始化图片存储相关的Supabase设置
-- VidFab AI Video Platform - Image-to-Video功能

-- 创建图片存储bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-images',
  'user-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 用户图片查看权限
INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
VALUES (
  'user-images-select-policy',
  'user-images',
  'SELECT',
  'bucket_id = ''user-images'' AND (
    -- 允许用户查看自己的图片
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- 允许查看公共图片（如果需要）
    (storage.foldername(name))[1] = ''public''
  )',
  '{authenticated}'
) ON CONFLICT (id) DO UPDATE SET
  definition = EXCLUDED.definition,
  roles = EXCLUDED.roles;

-- 用户图片上传权限
INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
VALUES (
  'user-images-insert-policy',
  'user-images',
  'INSERT',
  'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
  '{authenticated}'
) ON CONFLICT (id) DO UPDATE SET
  definition = EXCLUDED.definition,
  roles = EXCLUDED.roles;

-- 用户图片更新权限
INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
VALUES (
  'user-images-update-policy',
  'user-images',
  'UPDATE',
  'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
  '{authenticated}'
) ON CONFLICT (id) DO UPDATE SET
  definition = EXCLUDED.definition,
  roles = EXCLUDED.roles;

-- 用户图片删除权限
INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
VALUES (
  'user-images-delete-policy',
  'user-images',
  'DELETE',
  'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
  '{authenticated}'
) ON CONFLICT (id) DO UPDATE SET
  definition = EXCLUDED.definition,
  roles = EXCLUDED.roles;

-- 创建图片上传记录表（可选，用于跟踪上传历史）
CREATE TABLE IF NOT EXISTS public.user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 存储信息
  storage_path TEXT NOT NULL,
  original_name TEXT,
  file_size INTEGER,
  mime_type TEXT,

  -- 图片信息
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(10,4),

  -- 元数据
  upload_source TEXT CHECK (upload_source IN ('file', 'url')) DEFAULT 'file',
  original_url TEXT, -- 如果是从URL上传的，保存原始URL
  processing_options JSONB, -- 保存处理选项

  -- 状态
  status TEXT CHECK (status IN ('uploading', 'processing', 'completed', 'failed', 'deleted')) DEFAULT 'uploading',
  error_message TEXT,

  -- 使用统计
  used_in_videos INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON public.user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_status ON public.user_images(status);
CREATE INDEX IF NOT EXISTS idx_user_images_created_at ON public.user_images(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_user_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_images_updated_at ON public.user_images;
CREATE TRIGGER trigger_update_user_images_updated_at
  BEFORE UPDATE ON public.user_images
  FOR EACH ROW
  EXECUTE FUNCTION update_user_images_updated_at();

-- RLS策略
ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的图片
CREATE POLICY user_images_select_policy ON public.user_images
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的图片记录
CREATE POLICY user_images_insert_policy ON public.user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的图片记录
CREATE POLICY user_images_update_policy ON public.user_images
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的图片记录
CREATE POLICY user_images_delete_policy ON public.user_images
  FOR DELETE USING (auth.uid() = user_id);

-- 创建用户图片存储配额表
CREATE TABLE IF NOT EXISTS public.user_image_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 配额限制
  max_images INTEGER DEFAULT 100,
  max_storage_bytes BIGINT DEFAULT 1073741824, -- 1GB

  -- 当前使用量
  current_images INTEGER DEFAULT 0,
  current_storage_bytes BIGINT DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_image_quotas_user_id ON public.user_image_quotas(user_id);

-- RLS策略
ALTER TABLE public.user_image_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_image_quotas_select_policy ON public.user_image_quotas
  FOR SELECT USING (auth.uid() = user_id);

-- 创建触发器函数，在用户注册时自动创建配额记录
CREATE OR REPLACE FUNCTION create_user_image_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_image_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果用户表有新用户插入，自动创建配额记录
DROP TRIGGER IF EXISTS trigger_create_user_image_quota ON auth.users;
CREATE TRIGGER trigger_create_user_image_quota
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_image_quota();

-- 创建函数：更新用户图片配额使用量
CREATE OR REPLACE FUNCTION update_user_image_quota_usage(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_image_quotas (user_id, current_images, current_storage_bytes)
  SELECT
    user_uuid,
    COUNT(*),
    COALESCE(SUM(file_size), 0)
  FROM public.user_images
  WHERE user_id = user_uuid AND status = 'completed'
  ON CONFLICT (user_id) DO UPDATE SET
    current_images = EXCLUDED.current_images,
    current_storage_bytes = EXCLUDED.current_storage_bytes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当图片状态变化时更新配额
CREATE OR REPLACE FUNCTION trigger_update_image_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- 无论是插入、更新还是删除，都重新计算配额
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_image_quota_usage(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_image_quota_usage(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_image_quota ON public.user_images;
CREATE TRIGGER trigger_update_image_quota
  AFTER INSERT OR UPDATE OR DELETE ON public.user_images
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_image_quota();

-- 创建视图：用户图片概览
CREATE OR REPLACE VIEW public.user_images_overview AS
SELECT
  ui.user_id,
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE ui.status = 'completed') as completed_images,
  COUNT(*) FILTER (WHERE ui.status = 'failed') as failed_images,
  COALESCE(SUM(ui.file_size) FILTER (WHERE ui.status = 'completed'), 0) as total_size_bytes,
  ROUND(COALESCE(SUM(ui.file_size) FILTER (WHERE ui.status = 'completed'), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
  MAX(ui.created_at) as last_upload_at,
  uiq.max_images,
  uiq.max_storage_bytes,
  ROUND(uiq.max_storage_bytes / 1024.0 / 1024.0, 2) as max_storage_mb
FROM public.user_images ui
LEFT JOIN public.user_image_quotas uiq ON ui.user_id = uiq.user_id
GROUP BY ui.user_id, uiq.max_images, uiq.max_storage_bytes;

-- 赋予必要的权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_images TO authenticated;
GRANT ALL ON public.user_image_quotas TO authenticated;
GRANT SELECT ON public.user_images_overview TO authenticated;
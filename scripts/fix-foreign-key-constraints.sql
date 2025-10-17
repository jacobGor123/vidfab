-- =============================================
-- 修复外键约束问题
-- VidFab AI Video Platform Database Fix
-- =============================================
-- 问题：user_videos.user_id 引用了 auth.users(id) 但应用使用 public.users.uuid
-- 解决方案：修改外键约束引用正确的表和字段
-- =============================================

-- 1. 删除现有的外键约束
ALTER TABLE user_videos DROP CONSTRAINT IF EXISTS user_videos_user_id_fkey;
ALTER TABLE user_storage_quotas DROP CONSTRAINT IF EXISTS user_storage_quotas_user_id_fkey;

-- 2. 确保 public.users 表存在并有正确结构
CREATE TABLE IF NOT EXISTS public.users (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  nickname VARCHAR,
  avatar_url VARCHAR,
  signin_type VARCHAR DEFAULT 'oauth',
  signin_provider VARCHAR DEFAULT 'google',
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 添加正确的外键约束 - 引用 public.users.uuid
ALTER TABLE user_videos
ADD CONSTRAINT user_videos_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(uuid) ON DELETE CASCADE;

ALTER TABLE user_storage_quotas
ADD CONSTRAINT user_storage_quotas_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(uuid) ON DELETE CASCADE;

-- 4. 更新 RLS 策略 - 需要创建辅助函数来获取当前用户的 UUID
-- 因为 auth.uid() 返回的是 auth.users.id，我们需要映射到 public.users.uuid

-- 创建辅助函数获取当前用户的 public.users.uuid
CREATE OR REPLACE FUNCTION get_current_user_uuid()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- 从 public.users 表中获取与当前认证用户关联的 UUID
  SELECT uuid INTO user_uuid
  FROM public.users
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());

  RETURN user_uuid;
END;
$$;

-- 5. 删除并重新创建 RLS 策略
DROP POLICY IF EXISTS "Users can view own videos" ON user_videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON user_videos;
DROP POLICY IF EXISTS "Users can update own videos" ON user_videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON user_videos;

DROP POLICY IF EXISTS "Users can view own quota" ON user_storage_quotas;
DROP POLICY IF EXISTS "Users can update own quota" ON user_storage_quotas;
DROP POLICY IF EXISTS "Users can insert own quota" ON user_storage_quotas;

-- 重新创建 RLS 策略 - 使用我们的辅助函数
CREATE POLICY "Users can view own videos" ON user_videos
  FOR SELECT USING (get_current_user_uuid() = user_id);

CREATE POLICY "Users can insert own videos" ON user_videos
  FOR INSERT WITH CHECK (get_current_user_uuid() = user_id);

CREATE POLICY "Users can update own videos" ON user_videos
  FOR UPDATE USING (get_current_user_uuid() = user_id);

CREATE POLICY "Users can delete own videos" ON user_videos
  FOR DELETE USING (get_current_user_uuid() = user_id);

CREATE POLICY "Users can view own quota" ON user_storage_quotas
  FOR SELECT USING (get_current_user_uuid() = user_id);

CREATE POLICY "Users can update own quota" ON user_storage_quotas
  FOR UPDATE USING (get_current_user_uuid() = user_id);

CREATE POLICY "Users can insert own quota" ON user_storage_quotas
  FOR INSERT WITH CHECK (get_current_user_uuid() = user_id);

-- 6. 验证修复结果
DO $$
BEGIN
    -- 检查外键约束是否存在
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'user_videos_user_id_fkey'
        AND table_name = 'user_videos'
    ) THEN
        RAISE NOTICE '✅ user_videos 外键约束已修复';
    ELSE
        RAISE NOTICE '❌ user_videos 外键约束修复失败';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'user_storage_quotas_user_id_fkey'
        AND table_name = 'user_storage_quotas'
    ) THEN
        RAISE NOTICE '✅ user_storage_quotas 外键约束已修复';
    ELSE
        RAISE NOTICE '❌ user_storage_quotas 外键约束修复失败';
    END IF;

    RAISE NOTICE '🔧 外键约束修复完成';
    RAISE NOTICE '📋 现在 user_videos.user_id 引用 public.users.uuid';
    RAISE NOTICE '🔒 RLS 策略已更新使用 get_current_user_uuid()';
END $$;
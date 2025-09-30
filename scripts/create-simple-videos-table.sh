#!/bin/bash

# 在 Supabase 中创建 simple_videos 表
# 使用 psql 或 Supabase Dashboard 执行此 SQL

echo "🔨 Creating simple_videos table in Supabase..."

# 使用环境变量中的 Supabase URL 和密钥
source .env.local

# SQL 命令
SQL_COMMAND=$(cat <<EOF
-- 创建简单的视频表，不依赖任何外键
CREATE TABLE IF NOT EXISTS simple_videos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_email TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wavespeed_request_id TEXT UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  settings JSONB,
  storage_path TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_simple_videos_user_email ON simple_videos(user_email);
CREATE INDEX IF NOT EXISTS idx_simple_videos_user_id ON simple_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_simple_videos_created_at ON simple_videos(created_at DESC);

-- 启用 RLS（可选）
ALTER TABLE simple_videos ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（简化权限）
CREATE POLICY "Allow all operations" ON simple_videos
  FOR ALL
  USING (true)
  WITH CHECK (true);
EOF
)

echo "$SQL_COMMAND"

echo ""
echo "📋 请复制上面的 SQL 并在 Supabase Dashboard 中执行："
echo "1. 登录 Supabase Dashboard"
echo "2. 进入 SQL Editor"
echo "3. 粘贴并执行上述 SQL"
echo "4. 表创建成功后重新测试视频生成"

echo ""
echo "或者使用 psql 命令（如果已安装）："
echo "psql \"${NEXT_PUBLIC_SUPABASE_URL/https:\/\//postgresql://postgres:}@db.supabase.co:5432/postgres\" -c \"$SQL_COMMAND\""
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
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_simple_videos_user_email ON simple_videos(user_email);
CREATE INDEX IF NOT EXISTS idx_simple_videos_user_id ON simple_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_simple_videos_created_at ON simple_videos(created_at DESC);

-- 添加RLS策略
ALTER TABLE simple_videos ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的视频
CREATE POLICY "Users can view own videos" ON simple_videos
  FOR SELECT
  USING (true);  -- 暂时允许所有人查看，后续可以改为 user_email = current_user_email()

-- 允许服务器端插入
CREATE POLICY "Service role can insert" ON simple_videos
  FOR INSERT
  WITH CHECK (true);
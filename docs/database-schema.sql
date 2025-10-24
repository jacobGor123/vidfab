-- ================================================================
-- Admin Dashboard Database Schema
-- ================================================================
-- This SQL script creates all necessary tables and indexes for the
-- admin dashboard: Users, Orders, and Tasks management.
--
-- Execute this in your Supabase SQL Editor.
-- ================================================================

-- ================================================================
-- 1. ORDERS TABLE
-- ================================================================
-- Note: users table already exists in the system
-- We only need to create/update the orders table and task tables

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(100) UNIQUE NOT NULL,
  user_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  paid_email VARCHAR(255),
  product_name VARCHAR(255),
  product_id VARCHAR(100),
  amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'created',  -- created, paid, deleted
  interval VARCHAR(50),                  -- one-time, month, year
  stripe_session_id VARCHAR(255),
  order_detail JSONB,
  paid_detail JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_uuid ON orders(user_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_paid_email ON orders(paid_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);

-- ================================================================
-- 2. VIDEO GENERATION TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS video_generation_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  image_url TEXT,
  input_image TEXT,  -- Alternative field name
  prompt TEXT,
  description TEXT,  -- Alternative field name
  video_url TEXT,
  result_url TEXT,   -- Alternative field name
  model VARCHAR(50),
  provider VARCHAR(50),
  duration INTEGER,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  replicate_prediction_id VARCHAR(255),
  external_task_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video generation tasks indexes
CREATE INDEX IF NOT EXISTS idx_video_gen_user_id ON video_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_video_gen_status ON video_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_gen_created_at ON video_generation_tasks(created_at DESC);

-- ================================================================
-- 3. AUDIO GENERATION TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS audio_generation_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  video_url TEXT,
  prompt TEXT,
  audio_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  replicate_prediction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio generation tasks indexes
CREATE INDEX IF NOT EXISTS idx_audio_gen_user_id ON audio_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_gen_status ON audio_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audio_gen_created_at ON audio_generation_tasks(created_at DESC);

-- ================================================================
-- 4. WATERMARK REMOVAL TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS watermark_removal_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  video_url TEXT,
  input_video_url TEXT,  -- Alternative field name
  result_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watermark removal tasks indexes
CREATE INDEX IF NOT EXISTS idx_watermark_user_id ON watermark_removal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_watermark_status ON watermark_removal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_watermark_created_at ON watermark_removal_tasks(created_at DESC);

-- ================================================================
-- 5. VIDEO UPSCALER TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS video_upscaler_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  video_url TEXT,
  input_video_url TEXT,  -- Alternative field name
  result_url TEXT,
  target_resolution VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video upscaler tasks indexes
CREATE INDEX IF NOT EXISTS idx_upscaler_user_id ON video_upscaler_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_upscaler_status ON video_upscaler_tasks(status);
CREATE INDEX IF NOT EXISTS idx_upscaler_created_at ON video_upscaler_tasks(created_at DESC);

-- ================================================================
-- 6. VIDEO EFFECTS TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS video_effect_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  image_url TEXT,
  input_image_url TEXT,  -- Alternative field name
  result_url TEXT,
  video_url TEXT,        -- Alternative field name
  template_id VARCHAR(100),
  template_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  wavespeed_task_id VARCHAR(255),
  external_task_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video effects tasks indexes
CREATE INDEX IF NOT EXISTS idx_effects_user_id ON video_effect_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_effects_status ON video_effect_tasks(status);
CREATE INDEX IF NOT EXISTS idx_effects_created_at ON video_effect_tasks(created_at DESC);

-- ================================================================
-- 7. FACE SWAP TASKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS video_face_swap_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  user_email VARCHAR(255),
  face_image_url TEXT,
  video_url TEXT,
  input_video_url TEXT,  -- Alternative field name
  result_video_url TEXT,
  result_url TEXT,       -- Alternative field name
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  wavespeed_task_id VARCHAR(255),
  external_task_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Face swap tasks indexes
CREATE INDEX IF NOT EXISTS idx_face_swap_user_id ON video_face_swap_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_face_swap_status ON video_face_swap_tasks(status);
CREATE INDEX IF NOT EXISTS idx_face_swap_created_at ON video_face_swap_tasks(created_at DESC);

-- ================================================================
-- 8. UPDATE TRIGGERS (Auto-update updated_at)
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_gen_updated_at ON video_generation_tasks;
CREATE TRIGGER update_video_gen_updated_at
  BEFORE UPDATE ON video_generation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audio_gen_updated_at ON audio_generation_tasks;
CREATE TRIGGER update_audio_gen_updated_at
  BEFORE UPDATE ON audio_generation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watermark_updated_at ON watermark_removal_tasks;
CREATE TRIGGER update_watermark_updated_at
  BEFORE UPDATE ON watermark_removal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upscaler_updated_at ON video_upscaler_tasks;
CREATE TRIGGER update_upscaler_updated_at
  BEFORE UPDATE ON video_upscaler_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_effects_updated_at ON video_effect_tasks;
CREATE TRIGGER update_effects_updated_at
  BEFORE UPDATE ON video_effect_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_face_swap_updated_at ON video_face_swap_tasks;
CREATE TRIGGER update_face_swap_updated_at
  BEFORE UPDATE ON video_face_swap_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 9. ROW LEVEL SECURITY (Optional - for future use)
-- ================================================================
-- Uncomment these if you want to enable RLS
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE video_generation_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audio_generation_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE watermark_removal_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE video_upscaler_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE video_effect_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE video_face_swap_tasks ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these to verify the tables were created successfully:
/*
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'orders',
    'video_generation_tasks',
    'audio_generation_tasks',
    'watermark_removal_tasks',
    'video_upscaler_tasks',
    'video_effect_tasks',
    'video_face_swap_tasks'
  );

SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE '%tasks%' OR tablename = 'orders'
ORDER BY tablename, indexname;
*/

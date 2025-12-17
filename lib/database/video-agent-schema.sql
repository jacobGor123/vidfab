-- ==================================================
-- Video Agent Database Schema
-- VidFab Studio - Video Agent Beta 功能
--
-- 执行说明:
-- 1. 在 Supabase SQL Editor 中执行此脚本
-- 2. 确保已经执行了基础 schema (users 表等)
-- 3. 建议在测试环境先执行验证
-- ==================================================

-- ==================================================
-- 1. Video Agent Projects 主表
-- ==================================================
CREATE TABLE IF NOT EXISTS video_agent_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,

  -- 基本信息
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft',      -- 草稿
    'processing', -- 处理中
    'completed',  -- 已完成
    'failed'      -- 失败
  )),
  current_step INT DEFAULT 0 CHECK (current_step BETWEEN 0 AND 7),

  -- 步骤状态追踪 (pending | in_progress | completed | failed)
  step_1_status VARCHAR(20), -- 脚本分析
  step_2_status VARCHAR(20), -- 人物配置
  step_3_status VARCHAR(20), -- 风格选择
  step_4_status VARCHAR(20), -- 分镜生成
  step_5_status VARCHAR(20), -- 视频生成
  step_6_status VARCHAR(20), -- 音乐特效
  step_7_status VARCHAR(20), -- 最终合成

  -- 阶段 0: 用户输入
  duration INT NOT NULL CHECK (duration IN (15, 30, 45, 60)),
  story_style VARCHAR(20) NOT NULL CHECK (story_style IN (
    'auto',         -- 自动判断
    'comedy',       -- 搞笑
    'mystery',      -- 猎奇
    'moral',        -- 警世
    'twist',        -- 反转
    'suspense',     -- 悬疑
    'warmth',       -- 温情
    'inspiration'   -- 励志
  )),
  original_script TEXT NOT NULL,

  -- 步骤 1: 脚本分析结果 (JSON)
  script_analysis JSONB,
  /*
  script_analysis 示例结构:
  {
    "duration": 45,
    "shot_count": 6,
    "story_style": "twist",
    "characters": ["Prince", "Princess", "Dragon"],
    "shots": [
      {
        "shot_number": 1,
        "time_range": "0-7s",
        "description": "...",
        "camera_angle": "...",
        "character_action": "...",
        "characters": ["Prince"],
        "mood": "..."
      },
      ...
    ]
  }
  */

  -- 步骤 3: 图片风格
  image_style_id VARCHAR(50),  -- 'realistic' | 'anime' | 'cinematic' | 'cyberpunk' 等

  -- 步骤 4: 重新生成配额
  regenerate_quota_remaining INT DEFAULT 3,

  -- 步骤 6: 音乐和特效
  music_source VARCHAR(20),  -- 'template' | 'suno_ai' | 'none'
  music_url TEXT,
  music_storage_path TEXT,
  transition_effect VARCHAR(20) DEFAULT 'fade',  -- 'fade' | 'dissolve' | 'slide' | 'zoom'
  transition_duration DECIMAL(3,1) DEFAULT 0.5,  -- 0.3 ~ 1.0 秒

  -- 步骤 7: 最终视频
  final_video_url TEXT,
  final_video_storage_path TEXT,
  final_video_file_size BIGINT,  -- bytes
  final_video_resolution VARCHAR(10),  -- '1080p'
  total_generation_time INT,  -- 总耗时(秒)

  -- 积分追踪
  credits_used INT DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_video_agent_projects_user_status
  ON video_agent_projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_video_agent_projects_created_at
  ON video_agent_projects(created_at DESC);

COMMENT ON TABLE video_agent_projects IS 'Video Agent 项目主表，存储每个视频生成项目的完整信息';
COMMENT ON COLUMN video_agent_projects.script_analysis IS 'LLM 脚本分析结果 (JSON)';
COMMENT ON COLUMN video_agent_projects.regenerate_quota_remaining IS '全局重新生成配额剩余次数';

-- ==================================================
-- 2. Project Characters 人物配置表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,

  -- 人物基本信息
  character_name VARCHAR(100) NOT NULL,

  -- 人物来源
  source VARCHAR(20) NOT NULL CHECK (source IN (
    'template',     -- 从模板库选择
    'upload',       -- 用户上传
    'ai_generate'   -- AI 生成
  )),

  -- 模板库 (source='template')
  template_id VARCHAR(50),

  -- AI 生成 (source='ai_generate')
  generation_prompt TEXT,
  generation_model VARCHAR(50),  -- 'seedream-4.5'

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束: 每个项目中人物名称唯一
ALTER TABLE project_characters
  ADD CONSTRAINT unique_character_per_project
  UNIQUE (project_id, character_name);

-- 索引
CREATE INDEX IF NOT EXISTS idx_project_characters_project_id
  ON project_characters(project_id);

COMMENT ON TABLE project_characters IS '项目人物配置表，存储每个项目中的人物角色信息';

-- ==================================================
-- 3. Character Reference Images 人物参考图表
-- ==================================================
CREATE TABLE IF NOT EXISTS character_reference_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES project_characters(id) ON DELETE CASCADE,

  -- 图片信息
  image_url TEXT NOT NULL,              -- 外部 URL 或 Supabase Storage URL
  image_storage_path TEXT,              -- Supabase Storage 路径
  image_order INT NOT NULL,             -- 参考图顺序 (1, 2, 3, 4, 5)

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束: 每个人物的参考图顺序唯一
ALTER TABLE character_reference_images
  ADD CONSTRAINT unique_image_order_per_character
  UNIQUE (character_id, image_order);

-- 索引
CREATE INDEX IF NOT EXISTS idx_character_reference_images_character_id
  ON character_reference_images(character_id);

COMMENT ON TABLE character_reference_images IS '人物参考图表，存储用于生成分镜图的参考图片';

-- ==================================================
-- 4. Project Shots 分镜表 (结构化存储)
-- ==================================================
CREATE TABLE IF NOT EXISTS project_shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,

  -- 分镜编号
  shot_number INT NOT NULL,
  time_range VARCHAR(20),  -- "0-7s", "7-14s"

  -- 分镜描述 (从 LLM 分析结果提取)
  description TEXT NOT NULL,
  camera_angle VARCHAR(100),      -- "Wide shot, eye level"
  character_action TEXT,          -- "Walking slowly, looking at horizon"
  mood VARCHAR(100),              -- "Peaceful and nostalgic"

  -- 时长分配 (根据总时长自动计算)
  duration_seconds INT,  -- 5, 7, 8, 10 等

  -- 随机种子 (确保可重现)
  seed INT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束: 每个项目的分镜编号唯一
ALTER TABLE project_shots
  ADD CONSTRAINT unique_shot_per_project
  UNIQUE (project_id, shot_number);

-- 索引
CREATE INDEX IF NOT EXISTS idx_project_shots_project_id
  ON project_shots(project_id);

COMMENT ON TABLE project_shots IS '分镜表，存储每个项目的结构化分镜信息';

-- ==================================================
-- 5. Shot Characters 分镜-人物关联表
-- ==================================================
CREATE TABLE IF NOT EXISTS shot_characters (
  shot_id UUID NOT NULL REFERENCES project_shots(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES project_characters(id) ON DELETE CASCADE,

  PRIMARY KEY (shot_id, character_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shot_characters_shot_id
  ON shot_characters(shot_id);
CREATE INDEX IF NOT EXISTS idx_shot_characters_character_id
  ON shot_characters(character_id);

COMMENT ON TABLE shot_characters IS '分镜-人物关联表，标记每个分镜涉及哪些人物';

-- ==================================================
-- 6. Project Storyboards 分镜图表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_storyboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,
  shot_number INT NOT NULL,

  -- 图片信息
  image_url TEXT,
  image_storage_path TEXT,

  -- 生成信息
  generation_attempts INT DEFAULT 1,  -- 生成尝试次数
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN (
    'generating',  -- 生成中
    'success',     -- 成功
    'failed'       -- 失败
  )),
  error_message TEXT,

  -- Seedream 任务 ID
  seedream_task_id VARCHAR(100),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束: 每个项目的分镜编号对应一个分镜图
ALTER TABLE project_storyboards
  ADD CONSTRAINT unique_storyboard_per_shot
  UNIQUE (project_id, shot_number);

-- 索引
CREATE INDEX IF NOT EXISTS idx_project_storyboards_project_id
  ON project_storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_project_storyboards_status
  ON project_storyboards(status);
CREATE INDEX IF NOT EXISTS idx_project_storyboards_task_id
  ON project_storyboards(seedream_task_id);

COMMENT ON TABLE project_storyboards IS '分镜图表，存储每个分镜对应的生成图片';

-- ==================================================
-- 7. Project Video Clips 视频片段表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_video_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,
  shot_number INT NOT NULL,

  -- 视频信息
  video_url TEXT,
  video_storage_path TEXT,
  duration DECIMAL(4,1),  -- 实际视频时长 (秒)

  -- 生成信息
  retry_count INT DEFAULT 0,  -- 重试次数
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN (
    'generating',  -- 生成中
    'success',     -- 成功
    'failed'       -- 失败
  )),
  error_message TEXT,

  -- Seedance 任务 ID (复用现有 Seedance API)
  seedance_task_id VARCHAR(100),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束: 每个项目的分镜编号对应一个视频片段
ALTER TABLE project_video_clips
  ADD CONSTRAINT unique_video_clip_per_shot
  UNIQUE (project_id, shot_number);

-- 索引
CREATE INDEX IF NOT EXISTS idx_project_video_clips_project_id
  ON project_video_clips(project_id);
CREATE INDEX IF NOT EXISTS idx_project_video_clips_status
  ON project_video_clips(status);
CREATE INDEX IF NOT EXISTS idx_project_video_clips_task_id
  ON project_video_clips(seedance_task_id);

COMMENT ON TABLE project_video_clips IS '视频片段表，存储每个分镜对应的生成视频';

-- ==================================================
-- 8. Helper Function for Triggers (必须先创建)
-- ==================================================

-- 自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS '自动更新 updated_at 字段的触发器函数';

-- ==================================================
-- 9. Triggers (自动更新 updated_at)
-- ==================================================
CREATE TRIGGER update_video_agent_projects_updated_at
BEFORE UPDATE ON video_agent_projects
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_storyboards_updated_at
BEFORE UPDATE ON project_storyboards
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_video_clips_updated_at
BEFORE UPDATE ON project_video_clips
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==================================================
-- 10. Row Level Security (RLS) Policies
-- ==================================================

-- 启用 RLS
ALTER TABLE video_agent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_video_clips ENABLE ROW LEVEL SECURITY;

-- Projects: 用户只能访问自己的项目
CREATE POLICY video_agent_projects_policy ON video_agent_projects
FOR ALL USING (auth.uid()::text = user_id::text);

-- Characters: 通过 project_id 关联用户
CREATE POLICY project_characters_policy ON project_characters
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    WHERE vap.id = project_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- Character Images: 通过 character_id → project_id 关联用户
CREATE POLICY character_reference_images_policy ON character_reference_images
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    JOIN project_characters pc ON pc.project_id = vap.id
    WHERE pc.id = character_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- Shots: 通过 project_id 关联用户
CREATE POLICY project_shots_policy ON project_shots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    WHERE vap.id = project_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- Shot Characters: 通过 shot_id → project_id 关联用户
CREATE POLICY shot_characters_policy ON shot_characters
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    JOIN project_shots ps ON ps.project_id = vap.id
    WHERE ps.id = shot_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- Storyboards: 通过 project_id 关联用户
CREATE POLICY project_storyboards_policy ON project_storyboards
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    WHERE vap.id = project_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- Video Clips: 通过 project_id 关联用户
CREATE POLICY project_video_clips_policy ON project_video_clips
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM video_agent_projects vap
    WHERE vap.id = project_id
    AND vap.user_id::text = auth.uid()::text
  )
);

-- ==================================================
-- 11. Business Logic Helper Functions
-- ==================================================

-- 扣除重新生成配额
CREATE OR REPLACE FUNCTION deduct_regenerate_quota(p_project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE video_agent_projects
  SET regenerate_quota_remaining = GREATEST(regenerate_quota_remaining - 1, 0),
      updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_regenerate_quota IS '扣除项目的重新生成配额 (全局限制3次)';

-- 获取项目统计信息
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_shots', COUNT(DISTINCT ps.id),
    'completed_storyboards', COUNT(DISTINCT psb.id) FILTER (WHERE psb.status = 'success'),
    'completed_videos', COUNT(DISTINCT pvc.id) FILTER (WHERE pvc.status = 'success'),
    'failed_storyboards', COUNT(DISTINCT psb.id) FILTER (WHERE psb.status = 'failed'),
    'failed_videos', COUNT(DISTINCT pvc.id) FILTER (WHERE pvc.status = 'failed'),
    'total_characters', COUNT(DISTINCT pc.id),
    'regenerate_quota_remaining', vap.regenerate_quota_remaining,
    'current_step', vap.current_step,
    'status', vap.status
  )
  INTO result
  FROM video_agent_projects vap
  LEFT JOIN project_shots ps ON ps.project_id = vap.id
  LEFT JOIN project_storyboards psb ON psb.project_id = vap.id
  LEFT JOIN project_video_clips pvc ON pvc.project_id = vap.id
  LEFT JOIN project_characters pc ON pc.project_id = vap.id
  WHERE vap.id = p_project_id
  GROUP BY vap.id, vap.regenerate_quota_remaining, vap.current_step, vap.status;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_project_stats IS '获取项目的统计信息 (分镜数、完成数、配额等)';

-- 检查用户是否可以创建新项目 (可选的配额限制)
CREATE OR REPLACE FUNCTION can_user_create_project(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  project_count INT;
  user_plan VARCHAR(20);
BEGIN
  -- 获取用户订阅计划
  SELECT subscription_plan INTO user_plan
  FROM users
  WHERE uuid = p_user_id;

  -- 统计用户的进行中项目数
  SELECT COUNT(*) INTO project_count
  FROM video_agent_projects
  WHERE user_id = p_user_id
  AND status IN ('draft', 'processing');

  -- 根据订阅计划限制
  IF user_plan = 'free' THEN
    RETURN project_count < 3;  -- 免费用户最多 3 个进行中项目
  ELSIF user_plan IN ('lite', 'pro') THEN
    RETURN project_count < 10;  -- 付费用户最多 10 个
  ELSE
    RETURN project_count < 50;  -- 企业用户最多 50 个
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_create_project IS '检查用户是否可以创建新项目 (根据订阅计划限制)';

-- ==================================================
-- 12. 示例查询 (用于验证)
-- ==================================================

-- 查询用户的所有项目
-- SELECT * FROM video_agent_projects WHERE user_id = 'xxx' ORDER BY created_at DESC;

-- 查询项目的完整信息 (包括分镜、人物等)
-- SELECT
--   vap.*,
--   ps.id as shot_id,
--   ps.shot_number,
--   ps.description,
--   pc.character_name
-- FROM video_agent_projects vap
-- LEFT JOIN project_shots ps ON ps.project_id = vap.id
-- LEFT JOIN shot_characters sc ON sc.shot_id = ps.id
-- LEFT JOIN project_characters pc ON pc.id = sc.character_id
-- WHERE vap.id = 'project_id'
-- ORDER BY ps.shot_number;

-- 使用统计函数
-- SELECT get_project_stats('project_id');

-- 检查用户配额
-- SELECT can_user_create_project('user_id');

-- ==================================================
-- Schema 创建完成
-- ==================================================

-- ==================================================
-- Video Agent Schema 预检查脚本
-- 在执行主 Schema 前运行此脚本,确保环境准备就绪
-- ==================================================

-- ==================================================
-- 1. 检查 users 表是否存在
-- ==================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION '❌ 错误: users 表不存在! 请先创建 users 表或修改 Schema 中的外键引用';
  ELSE
    RAISE NOTICE '✅ users 表存在';
  END IF;
END $$;

-- ==================================================
-- 2. 检查 users.uuid 字段是否存在
-- ==================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'uuid'
  ) THEN
    RAISE EXCEPTION '❌ 错误: users.uuid 字段不存在! 请添加此字段或修改外键引用';
  ELSE
    RAISE NOTICE '✅ users.uuid 字段存在';
  END IF;
END $$;

-- ==================================================
-- 3. 检查 users.subscription_plan 字段
-- ==================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'subscription_plan'
  ) THEN
    RAISE WARNING '⚠️ 警告: users.subscription_plan 字段不存在';
    RAISE NOTICE '   → 如果需要使用 can_user_create_project() 函数,请先添加此字段:';
    RAISE NOTICE '   → ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(20) DEFAULT ''free'';';
    RAISE NOTICE '   → 或修改 can_user_create_project() 函数使其不依赖此字段';
  ELSE
    RAISE NOTICE '✅ users.subscription_plan 字段存在';
  END IF;
END $$;

-- ==================================================
-- 4. 检查是否已存在 video_agent 相关表
-- ==================================================
DO $$
DECLARE
  existing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(table_name) INTO existing_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND (
    table_name LIKE 'video_agent%'
    OR table_name IN (
      'project_characters',
      'character_reference_images',
      'project_shots',
      'shot_characters',
      'project_storyboards',
      'project_video_clips'
    )
  );

  IF existing_tables IS NOT NULL THEN
    RAISE WARNING '⚠️ 警告: 以下表已存在,执行 Schema 可能会跳过创建:';
    RAISE NOTICE '   → %', ARRAY_TO_STRING(existing_tables, ', ');
    RAISE NOTICE '   → 如需重新创建,请先手动删除这些表 (注意: 会丢失数据!)';
  ELSE
    RAISE NOTICE '✅ 没有发现已存在的 video_agent 相关表';
  END IF;
END $$;

-- ==================================================
-- 5. 显示当前数据库版本
-- ==================================================
SELECT
  version() AS postgresql_version,
  current_database() AS database_name,
  current_schema() AS schema_name;

-- ==================================================
-- 6. 检查扩展
-- ==================================================
SELECT
  extname AS extension_name,
  extversion AS version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'pgcrypto')
ORDER BY extname;

-- ==================================================
-- 预检查完成
-- ==================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 预检查完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '下一步:';
  RAISE NOTICE '1. 检查上述输出,确保没有 ❌ 错误';
  RAISE NOTICE '2. 如有 ⚠️ 警告,根据提示解决';
  RAISE NOTICE '3. 执行 video-agent-schema.sql';
  RAISE NOTICE '';
END $$;

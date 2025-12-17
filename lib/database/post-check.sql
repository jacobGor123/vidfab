-- ==================================================
-- Video Agent Schema 执行后验证脚本
-- 在执行 video-agent-schema.sql 后运行此脚本,验证所有对象创建成功
-- ==================================================

-- ==================================================
-- 1. 验证表创建
-- ==================================================
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'video_agent_projects',
    'project_characters',
    'character_reference_images',
    'project_shots',
    'shot_characters',
    'project_storyboards',
    'project_video_clips'
  ];
  existing_tables TEXT[];
  missing_tables TEXT[];
  table_name TEXT;
BEGIN
  SELECT ARRAY_AGG(t.table_name) INTO existing_tables
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_name = ANY(expected_tables);

  SELECT ARRAY_AGG(e) INTO missing_tables
  FROM UNNEST(expected_tables) e
  WHERE e NOT IN (SELECT UNNEST(COALESCE(existing_tables, ARRAY[]::TEXT[])));

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION '❌ 缺失表: %', ARRAY_TO_STRING(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ 所有表创建成功 (7/7)';
    FOREACH table_name IN ARRAY expected_tables LOOP
      RAISE NOTICE '   → %', table_name;
    END LOOP;
  END IF;
END $$;

-- ==================================================
-- 2. 验证索引创建
-- ==================================================
DO $$
DECLARE
  expected_indexes TEXT[] := ARRAY[
    'idx_video_agent_projects_user_status',
    'idx_video_agent_projects_created_at',
    'idx_project_characters_project_id',
    'idx_character_reference_images_character_id',
    'idx_project_shots_project_id',
    'idx_shot_characters_shot_id',
    'idx_shot_characters_character_id',
    'idx_project_storyboards_project_id',
    'idx_project_storyboards_status',
    'idx_project_storyboards_task_id',
    'idx_project_video_clips_project_id',
    'idx_project_video_clips_status',
    'idx_project_video_clips_task_id'
  ];
  existing_indexes TEXT[];
  missing_indexes TEXT[];
  index_count INT;
BEGIN
  SELECT ARRAY_AGG(indexname) INTO existing_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname = ANY(expected_indexes);

  SELECT ARRAY_AGG(e) INTO missing_indexes
  FROM UNNEST(expected_indexes) e
  WHERE e NOT IN (SELECT UNNEST(COALESCE(existing_indexes, ARRAY[]::TEXT[])));

  index_count := ARRAY_LENGTH(COALESCE(existing_indexes, ARRAY[]::TEXT[]), 1);

  IF missing_indexes IS NOT NULL THEN
    RAISE WARNING '⚠️ 缺失索引: %', ARRAY_TO_STRING(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ 所有索引创建成功 (%/13)', index_count;
  END IF;
END $$;

-- ==================================================
-- 3. 验证 RLS 启用状态
-- ==================================================
DO $$
DECLARE
  rls_disabled_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(tablename) INTO rls_disabled_tables
  FROM pg_tables
  WHERE schemaname = 'public'
  AND (
    tablename LIKE 'video_agent%'
    OR tablename IN (
      'project_characters',
      'character_reference_images',
      'project_shots',
      'shot_characters',
      'project_storyboards',
      'project_video_clips'
    )
  )
  AND rowsecurity = false;

  IF rls_disabled_tables IS NOT NULL THEN
    RAISE WARNING '⚠️ 以下表未启用 RLS: %', ARRAY_TO_STRING(rls_disabled_tables, ', ');
  ELSE
    RAISE NOTICE '✅ 所有表已启用 RLS (7/7)';
  END IF;
END $$;

-- ==================================================
-- 4. 验证 RLS 策略
-- ==================================================
DO $$
DECLARE
  expected_policies TEXT[] := ARRAY[
    'video_agent_projects_policy',
    'project_characters_policy',
    'character_reference_images_policy',
    'project_shots_policy',
    'shot_characters_policy',
    'project_storyboards_policy',
    'project_video_clips_policy'
  ];
  existing_policies TEXT[];
  missing_policies TEXT[];
  policy_count INT;
BEGIN
  SELECT ARRAY_AGG(policyname) INTO existing_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND policyname = ANY(expected_policies);

  SELECT ARRAY_AGG(e) INTO missing_policies
  FROM UNNEST(expected_policies) e
  WHERE e NOT IN (SELECT UNNEST(COALESCE(existing_policies, ARRAY[]::TEXT[])));

  policy_count := ARRAY_LENGTH(COALESCE(existing_policies, ARRAY[]::TEXT[]), 1);

  IF missing_policies IS NOT NULL THEN
    RAISE WARNING '⚠️ 缺失 RLS 策略: %', ARRAY_TO_STRING(missing_policies, ', ');
  ELSE
    RAISE NOTICE '✅ 所有 RLS 策略创建成功 (%/7)', policy_count;
  END IF;
END $$;

-- ==================================================
-- 5. 验证 Trigger
-- ==================================================
DO $$
DECLARE
  expected_triggers TEXT[] := ARRAY[
    'update_video_agent_projects_updated_at',
    'update_project_storyboards_updated_at',
    'update_project_video_clips_updated_at'
  ];
  existing_triggers TEXT[];
  missing_triggers TEXT[];
  trigger_count INT;
BEGIN
  SELECT ARRAY_AGG(trigger_name) INTO existing_triggers
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  AND trigger_name = ANY(expected_triggers);

  SELECT ARRAY_AGG(e) INTO missing_triggers
  FROM UNNEST(expected_triggers) e
  WHERE e NOT IN (SELECT UNNEST(COALESCE(existing_triggers, ARRAY[]::TEXT[])));

  trigger_count := ARRAY_LENGTH(COALESCE(existing_triggers, ARRAY[]::TEXT[]), 1);

  IF missing_triggers IS NOT NULL THEN
    RAISE WARNING '⚠️ 缺失 Trigger: %', ARRAY_TO_STRING(missing_triggers, ', ');
  ELSE
    RAISE NOTICE '✅ 所有 Trigger 创建成功 (%/3)', trigger_count;
  END IF;
END $$;

-- ==================================================
-- 6. 验证 Functions
-- ==================================================
DO $$
DECLARE
  expected_functions TEXT[] := ARRAY[
    'update_updated_at_column',
    'deduct_regenerate_quota',
    'get_project_stats',
    'can_user_create_project'
  ];
  existing_functions TEXT[];
  missing_functions TEXT[];
  function_count INT;
BEGIN
  SELECT ARRAY_AGG(routine_name) INTO existing_functions
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = ANY(expected_functions);

  SELECT ARRAY_AGG(e) INTO missing_functions
  FROM UNNEST(expected_functions) e
  WHERE e NOT IN (SELECT UNNEST(COALESCE(existing_functions, ARRAY[]::TEXT[])));

  function_count := ARRAY_LENGTH(COALESCE(existing_functions, ARRAY[]::TEXT[]), 1);

  IF missing_functions IS NOT NULL THEN
    RAISE WARNING '⚠️ 缺失 Function: %', ARRAY_TO_STRING(missing_functions, ', ');
  ELSE
    RAISE NOTICE '✅ 所有 Function 创建成功 (%/4)', function_count;
  END IF;
END $$;

-- ==================================================
-- 7. 验证唯一约束
-- ==================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'UNIQUE'
AND (
  tc.table_name LIKE 'video_agent%'
  OR tc.table_name IN (
    'project_characters',
    'character_reference_images',
    'project_shots',
    'shot_characters',
    'project_storyboards',
    'project_video_clips'
  )
)
ORDER BY tc.table_name, tc.constraint_name;

-- ==================================================
-- 8. 验证外键约束
-- ==================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND (
  tc.table_name LIKE 'video_agent%'
  OR tc.table_name IN (
    'project_characters',
    'character_reference_images',
    'project_shots',
    'shot_characters',
    'project_storyboards',
    'project_video_clips'
  )
)
ORDER BY tc.table_name;

-- ==================================================
-- 9. 表统计信息
-- ==================================================
SELECT
  t.table_name,
  pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) AS total_size,
  (SELECT COUNT(*)
   FROM information_schema.columns c
   WHERE c.table_schema = 'public'
   AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND (
  t.table_name LIKE 'video_agent%'
  OR t.table_name IN (
    'project_characters',
    'character_reference_images',
    'project_shots',
    'shot_characters',
    'project_storyboards',
    'project_video_clips'
  )
)
ORDER BY t.table_name;

-- ==================================================
-- 验证完成
-- ==================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 验证完成!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '请检查上述输出:';
  RAISE NOTICE '• 应该看到 7 个表、13 个索引、7 个 RLS 策略';
  RAISE NOTICE '• 应该看到 3 个 Trigger、4 个 Function';
  RAISE NOTICE '• 所有表都应该启用 RLS';
  RAISE NOTICE '';
  RAISE NOTICE '如有 ⚠️ 警告或 ❌ 错误,请检查 Schema 执行日志';
  RAISE NOTICE '';
END $$;

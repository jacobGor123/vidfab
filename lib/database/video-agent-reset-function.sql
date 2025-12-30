-- ==================================================
-- Video Agent - 步骤重置功能
-- 用于从指定步骤重新开始，清空后续所有数据
-- ==================================================

-- ==================================================
-- 函数: reset_project_from_step
-- 描述: 从指定步骤重置项目，清空该步骤及之后的所有数据
-- ==================================================
CREATE OR REPLACE FUNCTION reset_project_from_step(
  p_project_id UUID,
  p_from_step INT
) RETURNS JSON AS $$
DECLARE
  v_project_user_id UUID;
  v_result JSON;
BEGIN
  -- 验证项目是否存在
  SELECT user_id INTO v_project_user_id
  FROM video_agent_projects
  WHERE id = p_project_id;

  IF v_project_user_id IS NULL THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- 验证步骤范围
  IF p_from_step < 1 OR p_from_step > 7 THEN
    RAISE EXCEPTION 'Invalid step number: %. Must be between 1 and 7', p_from_step;
  END IF;

  -- 开始事务处理
  BEGIN
    -- 步骤 1: 脚本分析
    IF p_from_step <= 1 THEN
      UPDATE video_agent_projects
      SET
        script_analysis = NULL,
        step_1_status = NULL,
        step_2_status = NULL,
        step_3_status = NULL,
        step_4_status = NULL,
        step_5_status = NULL,
        step_6_status = NULL,
        step_7_status = NULL,
        image_style_id = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;

      -- 删除所有关联数据
      DELETE FROM shot_characters
      WHERE shot_id IN (SELECT id FROM project_shots WHERE project_id = p_project_id);

      DELETE FROM character_reference_images
      WHERE character_id IN (SELECT id FROM project_characters WHERE project_id = p_project_id);

      DELETE FROM project_characters WHERE project_id = p_project_id;
      DELETE FROM project_shots WHERE project_id = p_project_id;
      DELETE FROM project_storyboards WHERE project_id = p_project_id;
      DELETE FROM project_video_clips WHERE project_id = p_project_id;
    END IF;

    -- 步骤 2: 人物配置
    IF p_from_step = 2 THEN
      UPDATE video_agent_projects
      SET
        step_2_status = NULL,
        step_3_status = NULL,
        step_4_status = NULL,
        step_5_status = NULL,
        step_6_status = NULL,
        step_7_status = NULL,
        image_style_id = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;

      -- 删除人物及后续数据
      DELETE FROM shot_characters
      WHERE shot_id IN (SELECT id FROM project_shots WHERE project_id = p_project_id);

      DELETE FROM character_reference_images
      WHERE character_id IN (SELECT id FROM project_characters WHERE project_id = p_project_id);

      DELETE FROM project_characters WHERE project_id = p_project_id;
      DELETE FROM project_storyboards WHERE project_id = p_project_id;
      DELETE FROM project_video_clips WHERE project_id = p_project_id;
    END IF;

    -- 步骤 3: 图片风格 / 分镜生成准备
    IF p_from_step = 3 THEN
      UPDATE video_agent_projects
      SET
        step_3_status = NULL,
        step_4_status = NULL,
        step_5_status = NULL,
        step_6_status = NULL,
        step_7_status = NULL,
        image_style_id = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;

      -- 删除分镜图及后续数据
      DELETE FROM project_storyboards WHERE project_id = p_project_id;
      DELETE FROM project_video_clips WHERE project_id = p_project_id;
    END IF;

    -- 步骤 4: 分镜图生成
    IF p_from_step = 4 THEN
      UPDATE video_agent_projects
      SET
        step_4_status = NULL,
        step_5_status = NULL,
        step_6_status = NULL,
        step_7_status = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;

      -- 删除分镜图及后续数据
      DELETE FROM project_storyboards WHERE project_id = p_project_id;
      DELETE FROM project_video_clips WHERE project_id = p_project_id;
    END IF;

    -- 步骤 5: 视频生成
    IF p_from_step = 5 THEN
      UPDATE video_agent_projects
      SET
        step_5_status = NULL,
        step_6_status = NULL,
        step_7_status = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;

      -- 删除视频片段及后续数据
      DELETE FROM project_video_clips WHERE project_id = p_project_id;
    END IF;

    -- 步骤 6: 音乐特效
    IF p_from_step = 6 THEN
      UPDATE video_agent_projects
      SET
        step_6_status = NULL,
        step_7_status = NULL,
        music_source = NULL,
        music_url = NULL,
        music_storage_path = NULL,
        music_generation_prompt = NULL,
        suno_task_id = NULL,
        transition_effect = 'fade',
        transition_duration = 0.5,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;
    END IF;

    -- 步骤 7: 最终合成
    IF p_from_step = 7 THEN
      UPDATE video_agent_projects
      SET
        step_7_status = NULL,
        final_video_url = NULL,
        final_video_storage_path = NULL,
        final_video_file_size = NULL,
        final_video_resolution = NULL,
        updated_at = NOW()
      WHERE id = p_project_id;
    END IF;

    -- 重置 current_step 到指定步骤
    UPDATE video_agent_projects
    SET current_step = p_from_step
    WHERE id = p_project_id;

    -- 返回结果
    SELECT json_build_object(
      'success', true,
      'project_id', p_project_id,
      'reset_from_step', p_from_step,
      'message', format('Successfully reset project from step %s', p_from_step)
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- 回滚事务并返回错误
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_project_from_step IS '从指定步骤重置项目，清空该步骤及之后的所有数据';

-- ==================================================
-- 使用示例
-- ==================================================
-- SELECT reset_project_from_step('project-uuid-here', 3);
-- 这将清空步骤 3 及之后的所有数据，并将 current_step 重置为 3

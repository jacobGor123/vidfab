-- ==================================================
-- Migration: 添加 negative_prompt 字段到 project_characters 表
-- 日期: 2025-12-18
-- 描述: 为 project_characters 表添加 negative_prompt 字段，用于存储生成人物图片时的负向提示词
-- ==================================================

-- 添加 negative_prompt 字段
ALTER TABLE project_characters
ADD COLUMN IF NOT EXISTS negative_prompt TEXT;

-- 添加注释
COMMENT ON COLUMN project_characters.negative_prompt IS '人物图片生成的负向提示词（用于排除不想要的元素）';

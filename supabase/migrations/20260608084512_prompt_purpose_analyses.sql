-- Stores AI-generated prompt purpose classifications for admin task review.
-- The source prompt stays in user_videos/user_images; this table stores derived
-- analysis only and is read by server-side admin APIs.

CREATE TABLE IF NOT EXISTS public.prompt_purpose_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN ('video_generation', 'image_generation')),
  task_id UUID NOT NULL,
  prompt_hash TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (
    category IN (
      'marketing_ad',
      'product_showcase',
      'social_content',
      'storytelling',
      'education_tutorial',
      'entertainment_meme',
      'personal_memory',
      'character_avatar',
      'scene_visualization',
      'fashion_beauty',
      'music_dance',
      'game_anime',
      'business_presentation',
      'image_editing_request',
      'other'
    )
  ),
  label TEXT NOT NULL DEFAULT 'Other',
  summary TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  model TEXT,
  error_message TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_type, task_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_purpose_analyses_task
  ON public.prompt_purpose_analyses(task_type, task_id);

CREATE INDEX IF NOT EXISTS idx_prompt_purpose_analyses_hash
  ON public.prompt_purpose_analyses(prompt_hash)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_prompt_purpose_analyses_status
  ON public.prompt_purpose_analyses(status, analyzed_at DESC);

CREATE OR REPLACE FUNCTION public.update_prompt_purpose_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prompt_purpose_analyses_updated_at
  ON public.prompt_purpose_analyses;

CREATE TRIGGER trigger_update_prompt_purpose_analyses_updated_at
  BEFORE UPDATE ON public.prompt_purpose_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prompt_purpose_analyses_updated_at();

ALTER TABLE public.prompt_purpose_analyses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prompt_purpose_analyses FROM anon;
REVOKE ALL ON TABLE public.prompt_purpose_analyses FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prompt_purpose_analyses TO service_role;

COMMENT ON TABLE public.prompt_purpose_analyses IS
  'Admin-only AI classifications of text prompts for video/image generation tasks.';

-- Add mute_bgm field to video_agent_projects table
-- This field controls whether background music (BGM) is muted in non-narration mode
-- Default is true (BGM muted) as requested

ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS mute_bgm BOOLEAN DEFAULT true;

-- Add comment to explain the field
COMMENT ON COLUMN video_agent_projects.mute_bgm IS 'Whether to mute background music in non-narration mode. Only applicable when enable_narration is false.';

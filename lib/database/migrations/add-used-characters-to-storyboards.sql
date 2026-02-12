-- Migration: Add used_character_ids to project_storyboards
-- Purpose: Store which characters were actually used when generating each storyboard
-- This allows the UI to accurately show which characters should be selected

-- Add column to store character IDs used in this storyboard
ALTER TABLE project_storyboards
  ADD COLUMN IF NOT EXISTS used_character_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN project_storyboards.used_character_ids IS
  'Array of character IDs that were actually used to generate this storyboard.
   This is the source of truth for which characters should be selected in the edit dialog.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_storyboards_used_characters
  ON project_storyboards USING GIN (used_character_ids);

-- Migration: Extend character_name field length
-- Reason: Allow longer character descriptions (e.g., "Leo (Fawn-colored French Bulldog puppy...)")
-- Date: 2026-02-04

-- Extend character_name from VARCHAR(100) to VARCHAR(500)
ALTER TABLE project_characters
  ALTER COLUMN character_name TYPE VARCHAR(500);

-- Also update characters column in storyboard_shots if it exists
-- (This column stores JSON array of character names, but individual names should still fit)

/**
 * Add used_character_ids field to project_storyboards table
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

async function addField() {
  console.log('🔧 Adding used_character_ids field to project_storyboards\n')

  try {
    // Supabase doesn't support ALTER TABLE directly, so we need to use the REST API
    console.log('Please run this SQL manually in your Supabase SQL Editor:\n')
    console.log('----------------------------------------')
    console.log(`
-- Add column to store character IDs used in this storyboard
ALTER TABLE project_storyboards
  ADD COLUMN IF NOT EXISTS used_character_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN project_storyboards.used_character_ids IS
  'Array of character IDs that were actually used to generate this storyboard';

-- Create index
CREATE INDEX IF NOT EXISTS idx_storyboards_used_characters
  ON project_storyboards USING GIN (used_character_ids);
`)
    console.log('----------------------------------------\n')
    console.log('Or go to: https://supabase.com/dashboard/project/_/sql')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addField()

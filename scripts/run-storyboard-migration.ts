/**
 * Run migration: Add used_character_ids to project_storyboards
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running migration: Add used_character_ids to project_storyboards\n')

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'lib/database/migrations/add-used-characters-to-storyboards.sql'),
    'utf-8'
  )

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('   Added column: used_character_ids (JSONB)')
    console.log('   Created index: idx_storyboards_used_characters')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()

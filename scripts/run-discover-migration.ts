/**
 * Run migration: Discover media_type + content_tab
 * Usage: pnpm tsx scripts/run-discover-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running migration: Discover media_type + content_tab\n')

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'lib/database/migrations/add-discover-media-type-and-content-tab.sql'),
    'utf-8'
  )

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('   Added columns: media_type (default video), content_tab (default entertainment)')
    console.log('   Added constraints + index idx_discover_videos_tab_media_status')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()

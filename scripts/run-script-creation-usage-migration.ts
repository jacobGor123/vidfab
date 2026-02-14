/**
 * Run migration: Add script_creation_usage table
 * Tracks monthly script creation quota usage per user
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running migration: Add script_creation_usage table\n')

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'lib/database/migrations/add-script-creation-usage-table.sql'),
    'utf-8'
  )

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('   Created table: script_creation_usage')
    console.log('   - id (UUID, PK)')
    console.log('   - user_id (UUID, FK to users)')
    console.log('   - month (TEXT, YYYY-MM format)')
    console.log('   - count (INTEGER)')
    console.log('   - created_at, updated_at (TIMESTAMP)')
    console.log('   Created indexes:')
    console.log('   - idx_script_creation_usage_user_id')
    console.log('   - idx_script_creation_usage_month')
    console.log('   - idx_script_creation_usage_user_month')
    console.log('   Added triggers:')
    console.log('   - updated_at auto-update trigger')
    console.log('\n📊 Purpose: Track monthly script creation quota usage')
    console.log('   Free: 5/month, Lite: 10/month, Pro: 20/month, Premium: 50/month')
    console.log('   Overage: 3 credits per script')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()

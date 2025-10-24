/**
 * List all tables in the database
 * Run: npx tsx scripts/list-all-tables.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllTables() {
  console.log('🔍 Querying all tables in the database...\n');

  // Query all tables from information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name,
             (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    console.error('❌ Failed to query tables:', error);

    // Fallback: try querying common tables
    console.log('\n🔄 Trying alternative method...\n');

    const commonTables = [
      'users',
      'orders',
      'video_generation_tasks',
      'audio_generation_tasks',
      'watermark_removal_tasks',
      'video_upscaler_tasks',
      'video_effect_tasks',
      'video_face_swap_tasks',
      'tasks',
      'jobs',
      'video_jobs',
      'user_videos',
    ];

    for (const table of commonTables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`✅ ${table.padEnd(30)} - ${count || 0} rows`);
      }
    }
    return;
  }

  console.log('📊 Tables found:\n');
  data?.forEach((table: any) => {
    console.log(`   ${table.table_name.padEnd(40)} (${table.column_count} columns)`);
  });
}

listAllTables().catch(console.error);

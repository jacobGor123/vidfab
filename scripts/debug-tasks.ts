/**
 * Debug script to check task tables data
 * Run: npx tsx scripts/debug-tasks.ts
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

const taskTables = [
  'video_generation_tasks',
  'audio_generation_tasks',
  'watermark_removal_tasks',
  'video_upscaler_tasks',
  'video_effect_tasks',
  'video_face_swap_tasks',
];

async function debugTasks() {
  console.log('🔍 Checking task tables...\n');

  for (const table of taskTables) {
    console.log(`📋 Table: ${table}`);

    // Get count
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`   ❌ Error getting count:`, countError.message);
      console.error(`   Full error:`, countError);
      continue;
    }

    console.log(`   ✅ Total rows: ${count || 0}`);

    if (count && count > 0) {
      // Get sample data
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error(`   ❌ Error fetching data:`, error.message);
      } else {
        console.log(`   📄 Sample data (first 3):`);
        data?.forEach((row, idx) => {
          console.log(`      ${idx + 1}. ID: ${row.id}, Status: ${row.status}, Created: ${row.created_at}`);
        });
      }
    }
    console.log('');
  }

  console.log('\n✨ Debug complete!');
}

debugTasks().catch(console.error);

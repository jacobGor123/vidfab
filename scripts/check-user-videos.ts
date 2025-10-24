/**
 * Check user_videos table structure and data
 * Run: npx tsx scripts/check-user-videos.ts
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

async function checkUserVideos() {
  console.log('🔍 Checking user_videos table...\n');

  // Get count
  const { count } = await supabase
    .from('user_videos')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total rows: ${count || 0}\n`);

  if (count && count > 0) {
    // Get sample data
    const { data, error } = await supabase
      .from('user_videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error(`❌ Error fetching data:`, error);
      return;
    }

    console.log('📄 Sample data (first 5 rows):\n');
    data?.forEach((row, idx) => {
      console.log(`${idx + 1}. ─────────────────────────────`);
      console.log(`   ID: ${row.id}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Prompt: ${row.prompt?.substring(0, 50)}...`);
      console.log(`   Original URL: ${row.original_url ? 'Yes' : 'No'}`);
      console.log(`   Storage Path: ${row.storage_path || 'None'}`);
      console.log('');
    });

    // Get column names
    if (data && data.length > 0) {
      console.log('📋 All columns in user_videos table:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => console.log(`   - ${col}`));
    }
  }
}

checkUserVideos().catch(console.error);

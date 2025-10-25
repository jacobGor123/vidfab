/**
 * 检查任务相关表的结构和数据
 * Run: npx tsx scripts/check-tasks-tables.ts
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

async function checkTasksTables() {
  console.log('🔍 检查任务相关表的详细信息...\n');

  const taskTables = [
    'user_videos',
    'video_generation_tasks',
    'audio_generation_tasks',
    'watermark_removal_tasks',
    'video_upscaler_tasks',
    'video_effect_tasks',
    'video_face_swap_tasks',
  ];

  for (const tableName of taskTables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 表名: ${tableName}`);
    console.log('='.repeat(60));

    // 检查表是否存在并获取行数
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`❌ 表不存在或无法访问: ${countError.message}`);
      continue;
    }

    console.log(`✅ 表存在 - 共 ${count || 0} 行数据`);

    // 获取表的第一行数据来查看字段结构
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log(`⚠️ 无法获取样本数据: ${sampleError.message}`);
      continue;
    }

    if (sampleData && sampleData.length > 0) {
      console.log(`\n📊 字段列表 (基于样本数据):`);
      const fields = Object.keys(sampleData[0]);
      fields.forEach((field) => {
        const value = sampleData[0][field];
        const type = value === null ? 'null' : typeof value;
        console.log(`   - ${field.padEnd(30)} (${type})`);
      });
    } else {
      console.log(`\n⚠️ 表为空，无法获取字段结构`);

      // 尝试插入和立即删除来获取字段列表 (不推荐但可以尝试)
      console.log(`💡 表为空，无法直接查看字段结构`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ 检查完成');
  console.log('='.repeat(60));
}

checkTasksTables().catch(console.error);

/**
 * 检查 image to video 任务的 settings 字段结构
 * Run: npx tsx scripts/check-image-to-video-tasks.ts
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

async function checkImageToVideoTasks() {
  console.log('🔍 检查 user_videos 表中的 settings 字段结构...\n');

  // 获取最近的 20 条记录
  const { data, error } = await supabase
    .from('user_videos')
    .select('id, prompt, settings, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }

  console.log(`📊 找到 ${data.length} 条记录\n`);
  console.log('='.repeat(80));

  data.forEach((task, index) => {
    console.log(`\n[${index + 1}] Task ID: ${task.id}`);
    console.log(`   Prompt: ${task.prompt.substring(0, 60)}${task.prompt.length > 60 ? '...' : ''}`);
    console.log(`   Created: ${task.created_at}`);
    console.log(`   Settings 字段结构:`);

    const settings = task.settings;

    // 打印 settings 的所有键
    const keys = Object.keys(settings);
    console.log(`   - 包含的键 (${keys.length}个): ${keys.join(', ')}`);

    // 检查各种可能的图片字段
    const imageFields = ['image_url', 'imageUrl', 'inputImage', 'image', 'input_image'];
    let hasImage = false;
    let imageUrl = null;

    imageFields.forEach((field) => {
      if (settings[field]) {
        hasImage = true;
        imageUrl = settings[field];
        console.log(`   ✅ 发现图片字段: ${field} = ${settings[field]}`);
      }
    });

    if (!hasImage) {
      console.log(`   ❌ 未发现任何图片字段 (这是 text_to_video 任务)`);
    }

    // 打印完整的 settings 对象
    console.log(`   完整 settings:`, JSON.stringify(settings, null, 2));
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ 检查完成');
}

checkImageToVideoTasks().catch(console.error);

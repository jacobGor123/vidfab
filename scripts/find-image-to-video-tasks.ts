/**
 * 搜索所有包含图片的任务
 * Run: npx tsx scripts/find-image-to-video-tasks.ts
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

async function findImageToVideoTasks() {
  console.log('🔍 搜索所有 user_videos 记录，查找包含图片的任务...\n');

  // 获取所有记录
  const { data, error } = await supabase
    .from('user_videos')
    .select('id, prompt, settings, created_at')
    .order('created_at', { ascending: false })
    .limit(1000); // 查询更多记录

  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }

  console.log(`📊 总共找到 ${data.length} 条记录\n`);

  // 可能的图片字段名
  const imageFields = [
    'image_url',
    'imageUrl',
    'inputImage',
    'image',
    'input_image',
    'img_url',
    'imgUrl',
    'input_img',
    'inputImg',
  ];

  // 查找包含图片的任务
  const imageToVideoTasks = data.filter((task) => {
    const settings = task.settings;
    return imageFields.some((field) => settings && settings[field]);
  });

  console.log(`🖼️ 找到 ${imageToVideoTasks.length} 个 image_to_video 任务\n`);
  console.log('='.repeat(80));

  if (imageToVideoTasks.length === 0) {
    console.log('\n❌ 没有找到任何包含图片的任务！');
    console.log('\n可能的原因：');
    console.log('1. 用户从未使用过 image_to_video 功能');
    console.log('2. 图片字段使用了不同的命名方式');
    console.log('\n让我检查一下 settings 中出现过的所有字段名...\n');

    // 统计所有出现过的 settings 字段
    const allFieldsSet = new Set<string>();
    data.forEach((task) => {
      const settings = task.settings;
      if (settings && typeof settings === 'object') {
        Object.keys(settings).forEach((key) => allFieldsSet.add(key));
      }
    });

    console.log('📋 settings 中出现过的所有字段名:');
    Array.from(allFieldsSet)
      .sort()
      .forEach((field) => console.log(`   - ${field}`));

    return;
  }

  // 展示前 10 个 image_to_video 任务
  imageToVideoTasks.slice(0, 10).forEach((task, index) => {
    console.log(`\n[${index + 1}] Task ID: ${task.id}`);
    console.log(`   Prompt: ${task.prompt.substring(0, 60)}${task.prompt.length > 60 ? '...' : ''}`);
    console.log(`   Created: ${task.created_at}`);

    const settings = task.settings;

    // 找出包含图片的字段
    imageFields.forEach((field) => {
      if (settings[field]) {
        console.log(`   ✅ 图片字段: ${field}`);
        console.log(`   📷 图片URL: ${settings[field]}`);
      }
    });

    console.log(`   完整 settings:`, JSON.stringify(settings, null, 2));
  });

  console.log('\n' + '='.repeat(80));
  console.log(`✅ 总结: 找到 ${imageToVideoTasks.length} 个 image_to_video 任务`);
}

findImageToVideoTasks().catch(console.error);

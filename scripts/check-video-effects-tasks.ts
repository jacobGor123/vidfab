/**
 * 检查 video effects 任务
 * Run: npx tsx scripts/check-video-effects-tasks.ts
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

async function checkVideoEffectsTasks() {
  console.log('🔍 检查 video effects 任务...\n');

  // 获取所有记录
  const { data, error } = await supabase
    .from('user_videos')
    .select('id, prompt, settings, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }

  console.log(`📊 总共 ${data.length} 条记录\n`);

  // 查找 video-effects 任务（通过 model 字段判断）
  const videoEffectsTasks = data.filter((task) => {
    const settings = task.settings;
    return settings?.model === 'video-effects';
  });

  console.log(`🎨 找到 ${videoEffectsTasks.length} 个 video-effects 任务\n`);
  console.log('='.repeat(80));

  if (videoEffectsTasks.length === 0) {
    console.log('\n❌ 没有找到任何 video-effects 任务！');

    // 检查是否有其他特效相关的字段
    console.log('\n🔍 检查 settings 中是否有特效相关字段...\n');

    const effectFields = ['effect', 'effectId', 'effect_id', 'effectName', 'effect_name', 'template', 'templateId', 'template_id'];

    const tasksWithEffects = data.filter((task) => {
      const settings = task.settings;
      return effectFields.some((field) => settings && settings[field]);
    });

    if (tasksWithEffects.length > 0) {
      console.log(`✅ 找到 ${tasksWithEffects.length} 个包含特效字段的任务:`);
      tasksWithEffects.slice(0, 5).forEach((task, index) => {
        console.log(`\n[${index + 1}] Task ID: ${task.id}`);
        console.log(`   Prompt: ${task.prompt.substring(0, 60)}${task.prompt.length > 60 ? '...' : ''}`);
        console.log(`   Settings:`, JSON.stringify(task.settings, null, 2));
      });
    } else {
      console.log('❌ 也没有找到任何包含特效字段的任务');
    }

    return;
  }

  // 展示 video-effects 任务
  videoEffectsTasks.slice(0, 10).forEach((task, index) => {
    console.log(`\n[${index + 1}] Task ID: ${task.id}`);
    console.log(`   Prompt: ${task.prompt.substring(0, 60)}${task.prompt.length > 60 ? '...' : ''}`);
    console.log(`   Created: ${task.created_at}`);

    const settings = task.settings;

    // 查找特效相关的字段
    const effectFields = ['effect', 'effectId', 'effect_id', 'effectName', 'effect_name', 'template', 'templateId', 'template_id'];

    effectFields.forEach((field) => {
      if (settings[field]) {
        console.log(`   ✅ 特效字段: ${field} = ${settings[field]}`);
      }
    });

    console.log(`   完整 settings:`, JSON.stringify(settings, null, 2));
  });

  console.log('\n' + '='.repeat(80));
  console.log(`✅ 检查完成 - 找到 ${videoEffectsTasks.length} 个 video-effects 任务`);

  // 统计不同的特效 ID
  const effectIds = new Set<string>();
  const effectNames = new Set<string>();

  videoEffectsTasks.forEach((task) => {
    const settings = task.settings;
    if (settings.effectId || settings.effect_id) {
      effectIds.add(settings.effectId || settings.effect_id);
    }
    if (settings.effectName || settings.effect_name) {
      effectNames.add(settings.effectName || settings.effect_name);
    }
  });

  if (effectIds.size > 0) {
    console.log(`\n📊 发现 ${effectIds.size} 种不同的特效 ID:`);
    Array.from(effectIds).forEach((id) => console.log(`   - ${id}`));
  }

  if (effectNames.size > 0) {
    console.log(`\n📊 发现 ${effectNames.size} 种不同的特效名称:`);
    Array.from(effectNames).forEach((name) => console.log(`   - ${name}`));
  }
}

checkVideoEffectsTasks().catch(console.error);

/**
 * 手动创建用户记录的脚本
 * 使用方法: node scripts/create-user-manual.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(userId, email) {
  try {
    console.log(`🔧 Checking/Creating user: ${userId} (${email})`);

    // 检查是否已存在 (不用single,避免错误)
    const { data: existing, error: queryError } = await supabase
      .from('users')
      .select('uuid, email')
      .eq('uuid', userId);

    console.log('Query result:', { count: existing?.length, error: queryError?.message });

    if (existing && existing.length > 0) {
      console.log('✅ User already exists:', existing[0]);
      return true;
    }

    console.log('❌ User NOT found, creating...');

    // 创建用户
    const { data, error } = await supabase
      .from('users')
      .insert({
        uuid: userId,
        email: email.toLowerCase().trim(),
        nickname: email.split('@')[0],
        avatar_url: '',
        signin_type: 'credentials',
        signin_provider: 'email',
        signin_openid: userId,
        signin_ip: '0.0.0.0',
        email_verified: true,
        is_active: true,
        subscription_plan: 'free',
        subscription_status: 'active',
        credits_remaining: 50,
        total_videos_processed: 0,
        storage_used_mb: 0,
        max_storage_mb: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ User created successfully!', newUser);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err);
    process.exit(1);
  }
}

// 从命令行参数读取,或使用日志中的默认值
const userId = process.argv[2] || '97b58959-ac28-46b6-a35f-62f91d28fbba';
const email = process.argv[3] || 'user@vidfab.ai';

createUser(userId, email).then(() => process.exit(0));

/**
 * 修复用户记录 - 确保当前登录用户存在于数据库中
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserRecord() {
  const userId = '97b58959-ac28-46b6-a35f-62f91d28fbba';
  const userEmail = 'jsdasww593@gmail.com';

  try {
    console.log(`\n🔍 Checking user ${userId} (${userEmail})...\n`);

    // 1. 检查用户是否存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('uuid, email, nickname')
      .eq('uuid', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking user:', checkError);
      return;
    }

    if (existingUser) {
      console.log('✅ User already exists:');
      console.log(`   UUID: ${existingUser.uuid}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Nickname: ${existingUser.nickname}`);
      return;
    }

    console.log('❌ User NOT found in database. Creating...\n');

    // 2. 创建用户记录
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        uuid: userId,
        email: userEmail.toLowerCase().trim(),
        nickname: userEmail.split('@')[0],
        avatar_url: '',
        signin_type: 'verification-code',
        signin_provider: 'verification-code',
        signin_openid: userId,
        signin_ip: '0.0.0.0',
        email_verified: true,
        is_active: true,
        subscription_plan: 'lite',
        subscription_status: 'active',
        credits_remaining: 3326,
        total_videos_processed: 0,
        storage_used_mb: 0,
        max_storage_mb: 1024,
        created_at: '2025-09-24T10:10:48.279+00:00', // 保持原始创建时间
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create user:', insertError);
      return;
    }

    console.log('✅ User created successfully!');
    console.log(`   UUID: ${newUser.uuid}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Nickname: ${newUser.nickname}`);
    console.log(`   Plan: ${newUser.subscription_plan}`);
    console.log(`   Credits: ${newUser.credits_remaining}`);

    // 3. 验证创建成功
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('uuid, email')
      .eq('uuid', userId)
      .single();

    if (verifyError || !verifyUser) {
      console.error('\n❌ Verification failed! User still not found.');
      return;
    }

    console.log('\n✅ Verification passed! User exists in database.');

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

fixUserRecord().then(() => process.exit(0));

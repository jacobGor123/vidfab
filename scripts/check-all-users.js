/**
 * 检查所有用户账号
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

async function checkAllUsers() {
  try {
    // 查询所有用户
    const { data: users, error } = await supabase
      .from('users')
      .select('uuid, email, nickname, created_at, signin_provider')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`\n📊 Found ${users.length} users:\n`);

    users.forEach(user => {
      console.log(`UUID: ${user.uuid}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Nickname: ${user.nickname}`);
      console.log(`  Provider: ${user.signin_provider}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

    // 特别检查视频所属的用户
    const videoOwnerUserId = '698a569c-2043-5876-9de2-827804b45989';
    const { data: videoOwner, error: ownerError } = await supabase
      .from('users')
      .select('uuid, email, nickname, signin_provider, created_at')
      .eq('uuid', videoOwnerUserId)
      .single();

    console.log(`\n🎯 Video owner user ${videoOwnerUserId}:`);
    if (ownerError) {
      console.log(`  ❌ Error: ${ownerError.message}`);
    } else if (videoOwner) {
      console.log(`  ✅ Email: ${videoOwner.email}`);
      console.log(`  ✅ Nickname: ${videoOwner.nickname}`);
      console.log(`  ✅ Provider: ${videoOwner.signin_provider}`);
      console.log(`  ✅ Created: ${videoOwner.created_at}`);
    } else {
      console.log(`  ❌ Not found`);
    }

    // 当前登录用户
    const currentUserId = '97b58959-ac28-46b6-a35f-62f91d28fbba';
    const { data: currentUser, error: currentError } = await supabase
      .from('users')
      .select('uuid, email, nickname, signin_provider, created_at')
      .eq('uuid', currentUserId)
      .single();

    console.log(`\n👤 Current user ${currentUserId}:`);
    if (currentError) {
      console.log(`  ❌ Error: ${currentError.message}`);
    } else if (currentUser) {
      console.log(`  ✅ Email: ${currentUser.email}`);
      console.log(`  ✅ Nickname: ${currentUser.nickname}`);
      console.log(`  ✅ Provider: ${currentUser.signin_provider}`);
      console.log(`  ✅ Created: ${currentUser.created_at}`);
    } else {
      console.log(`  ❌ Not found`);
    }

    // 查找相同邮箱的用户
    const targetEmail = 'jsdasww593@gmail.com';
    const { data: sameEmailUsers, error: emailError } = await supabase
      .from('users')
      .select('uuid, email, nickname, signin_provider, created_at')
      .eq('email', targetEmail);

    console.log(`\n📧 Users with email ${targetEmail}:`);
    console.log(`  Count: ${sameEmailUsers?.length || 0}`);
    if (sameEmailUsers && sameEmailUsers.length > 0) {
      sameEmailUsers.forEach(u => {
        console.log(`  - UUID: ${u.uuid}`);
        console.log(`    Nickname: ${u.nickname}`);
        console.log(`    Provider: ${u.signin_provider}`);
        console.log(`    Created: ${u.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkAllUsers().then(() => process.exit(0));

/**
 * 检查 users 表结构
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

async function checkUsersTable() {
  try {
    const targetUserId = '97b58959-ac28-46b6-a35f-62f91d28fbba';

    // 查询用户的所有字段
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📊 User record fields:\n');
    Object.entries(user).forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value;
      console.log(`  ${key}: ${displayValue}`);
    });

    console.log('\n🔍 Key fields:');
    console.log(`  id (primary key?): ${user.id || 'NOT FOUND'}`);
    console.log(`  uuid: ${user.uuid}`);

    // 查询另一个有视频的用户
    const videoOwnerUserId = '698a569c-2043-5876-9de2-827804b45989';
    const { data: videoOwner, error: ownerError } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', videoOwnerUserId)
      .maybeSingle();

    if (videoOwner) {
      console.log('\n📊 Video owner user (for comparison):');
      console.log(`  id: ${videoOwner.id || 'NOT FOUND'}`);
      console.log(`  uuid: ${videoOwner.uuid}`);
      console.log(`  email: ${videoOwner.email}`);
    }

    // 查询一个视频记录,看看 user_id 的实际值
    const { data: sampleVideo, error: videoError } = await supabase
      .from('user_videos')
      .select('id, user_id, prompt')
      .limit(1)
      .maybeSingle();

    if (sampleVideo) {
      console.log('\n📊 Sample video record:');
      console.log(`  video.id: ${sampleVideo.id}`);
      console.log(`  video.user_id: ${sampleVideo.user_id}`);
      console.log(`  video.prompt: ${sampleVideo.prompt.substring(0, 40)}...`);

      // 检查这个 user_id 是 uuid 还是 id
      const { data: userByVideoId, error: userByIdError } = await supabase
        .from('users')
        .select('id, uuid, email')
        .eq('uuid', sampleVideo.user_id)
        .maybeSingle();

      if (userByVideoId) {
        console.log('\n✅ video.user_id matches users.uuid:');
        console.log(`  users.id: ${userByVideoId.id}`);
        console.log(`  users.uuid: ${userByVideoId.uuid}`);
        console.log(`  users.email: ${userByVideoId.email}`);
      } else {
        console.log('\n⚠️  video.user_id does NOT match users.uuid, trying users.id...');

        // 尝试用 id 匹配
        const { data: userById, error: byIdError } = await supabase
          .from('users')
          .select('id, uuid, email')
          .eq('id', sampleVideo.user_id)
          .maybeSingle();

        if (userById) {
          console.log('\n❌ PROBLEM FOUND! video.user_id matches users.id (not users.uuid):');
          console.log(`  users.id: ${userById.id}`);
          console.log(`  users.uuid: ${userById.uuid}`);
          console.log(`  users.email: ${userById.email}`);
          console.log('\n💡 This means the foreign key constraint is on users.id, not users.uuid!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkUsersTable().then(() => process.exit(0));

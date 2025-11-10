/**
 * 检查 user_videos 表中的 user_id 字段
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

async function checkVideoUserIds() {
  try {
    // 1. 查询所有视频的 user_id (不过滤)
    const { data: allVideos, error: allError } = await supabase
      .from('user_videos')
      .select('id, user_id, prompt, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (allError) {
      console.error('❌ Error fetching all videos:', allError);
      return;
    }

    console.log(`\n📊 Found ${allVideos.length} videos in total:\n`);

    // 按 user_id 分组统计
    const userIdGroups = {};
    allVideos.forEach(video => {
      const userId = video.user_id || 'NULL';
      if (!userIdGroups[userId]) {
        userIdGroups[userId] = [];
      }
      userIdGroups[userId].push(video);
    });

    console.log('📊 Videos grouped by user_id:\n');
    Object.entries(userIdGroups).forEach(([userId, videos]) => {
      console.log(`\nuser_id: ${userId}`);
      console.log(`  Video count: ${videos.length}`);
      videos.forEach(v => {
        console.log(`  - ${v.id} | ${v.status} | ${v.prompt.substring(0, 40)}... | ${v.created_at}`);
      });
    });

    // 2. 特别检查目标用户的视频
    const targetUserId = '97b58959-ac28-46b6-a35f-62f91d28fbba';
    const { data: targetVideos, error: targetError } = await supabase
      .from('user_videos')
      .select('id, user_id, prompt, status')
      .eq('user_id', targetUserId)
      .neq('status', 'deleted');

    console.log(`\n🎯 Videos for target user ${targetUserId}:`);
    console.log(`  Count: ${targetVideos?.length || 0}`);
    if (targetVideos && targetVideos.length > 0) {
      targetVideos.forEach(v => {
        console.log(`  - ${v.id} | ${v.status} | ${v.prompt.substring(0, 40)}...`);
      });
    }

    // 3. 检查 users 表中是否存在这个用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('uuid, email')
      .eq('uuid', targetUserId)
      .single();

    console.log(`\n👤 User ${targetUserId}:`);
    if (userError) {
      console.log(`  ❌ Error: ${userError.message}`);
    } else if (user) {
      console.log(`  ✅ Exists: ${user.email}`);
    } else {
      console.log(`  ❌ Not found`);
    }

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkVideoUserIds().then(() => process.exit(0));

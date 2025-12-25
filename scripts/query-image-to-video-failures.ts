/**
 * 查询 image to video API 的失败记录
 * 分析 user_videos 表中的失败情况
 */

import { supabaseAdmin } from '../lib/supabase';

async function queryImageToVideoFailures() {
  console.log('🔍 开始查询 Image to Video API 失败记录...\n');

  try {
    // 1. 查看所有状态分布
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 User Videos 表状态分布`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: allVideos, error: allError } = await supabaseAdmin
      .from('user_videos')
      .select('id, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (allError) {
      console.error('❌ 查询失败:', allError);
      return;
    }

    const statusStats = new Map<string, number>();
    let errorCount = 0;

    allVideos?.forEach(video => {
      statusStats.set(video.status, (statusStats.get(video.status) || 0) + 1);
      if (video.error_message) {
        errorCount++;
      }
    });

    console.log(`最近 100 条记录的状态分布:`);
    statusStats.forEach((count, status) => {
      console.log(`  ${status}: ${count} 条`);
    });
    console.log(`\n包含错误信息的记录: ${errorCount} 条\n`);

    // 2. 查询失败的记录
    const { data: failedVideos, error: failedError } = await supabaseAdmin
      .from('user_videos')
      .select(`
        id,
        user_id,
        wavespeed_request_id,
        prompt,
        settings,
        original_url,
        storage_path,
        status,
        error_message,
        download_progress,
        created_at,
        updated_at
      `)
      .or('status.eq.failed,error_message.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (failedError) {
      console.error('❌ 查询失败记录出错:', failedError);
      return;
    }

    if (!failedVideos || failedVideos.length === 0) {
      console.log('✅ 没有找到失败的记录\n');
      return;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📸 找到 ${failedVideos.length} 条失败记录`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const errorStats = new Map<string, number>();
    const userStats = new Map<string, number>();

    failedVideos.forEach((video, index) => {
      console.log(`\n━━━ 记录 #${index + 1} ━━━`);
      console.log(`ID: ${video.id}`);
      console.log(`User ID: ${video.user_id}`);
      console.log(`Request ID: ${video.wavespeed_request_id}`);
      console.log(`Status: ${video.status}`);
      console.log(`Prompt: ${video.prompt?.substring(0, 100)}...`);
      console.log(`Settings:`, JSON.stringify(video.settings, null, 2));
      console.log(`Original URL: ${video.original_url || 'N/A'}`);
      console.log(`Storage Path: ${video.storage_path || 'N/A'}`);
      console.log(`Download Progress: ${video.download_progress}%`);
      console.log(`Error Message: ${video.error_message || 'N/A'}`);
      console.log(`Created At: ${video.created_at}`);
      console.log(`Updated At: ${video.updated_at}`);

      // 统计错误类型
      const errorKey = video.error_message || 'Unknown Error';
      errorStats.set(errorKey, (errorStats.get(errorKey) || 0) + 1);

      // 统计用户
      userStats.set(video.user_id, (userStats.get(video.user_id) || 0) + 1);
    });

    // 3. 输出统计信息
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 错误类型统计`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const sortedErrors = Array.from(errorStats.entries()).sort((a, b) => b[1] - a[1]);
    sortedErrors.forEach(([error, count]) => {
      console.log(`[${count}次] ${error}`);
    });

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👥 受影响用户统计`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const sortedUsers = Array.from(userStats.entries()).sort((a, b) => b[1] - a[1]);
    sortedUsers.forEach(([userId, count]) => {
      console.log(`User ${userId}: ${count} 次失败`);
    });

    // 4. 查询成功率
    const totalCount = allVideos?.length || 0;
    const failedCount = failedVideos.length;
    const successCount = totalCount - failedCount;
    const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0.00';

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 成功率统计 (最近 ${totalCount} 条记录)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`总记录数: ${totalCount}`);
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${failedCount} 条`);
    console.log(`成功率: ${successRate}%`);

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行查询
queryImageToVideoFailures()
  .then(() => {
    console.log('\n\n✅ 查询完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

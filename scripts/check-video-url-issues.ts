/**
 * 检查视频 URL 问题
 * 查找状态为 completed 但可能 URL 无效或过期的记录
 */

import { supabaseAdmin } from '../lib/supabase';

async function checkVideoUrlIssues() {
  console.log('🔍 开始检查视频 URL 问题...\n');

  try {
    // 查询所有 completed 状态的视频
    const { data: completedVideos, error } = await supabaseAdmin
      .from('user_videos')
      .select(`
        id,
        user_id,
        wavespeed_request_id,
        prompt,
        original_url,
        storage_path,
        status,
        download_progress,
        created_at,
        updated_at
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }

    if (!completedVideos || completedVideos.length === 0) {
      console.log('❌ 没有找到 completed 状态的记录');
      return;
    }

    console.log(`找到 ${completedVideos.length} 条 completed 状态的记录\n`);

    // 分类统计
    const stats = {
      total: completedVideos.length,
      hasOriginalUrl: 0,
      hasStoragePath: 0,
      onlyOriginalUrl: 0,
      onlyStoragePath: 0,
      both: 0,
      neither: 0,
      suspiciousUrl: 0, // URL 看起来可疑（比如包含过期时间戳）
    };

    const suspiciousRecords: any[] = [];
    const missingUrlRecords: any[] = [];

    completedVideos.forEach(video => {
      const hasOriginal = !!video.original_url;
      const hasStorage = !!video.storage_path;

      if (hasOriginal) stats.hasOriginalUrl++;
      if (hasStorage) stats.hasStoragePath++;

      if (hasOriginal && hasStorage) {
        stats.both++;
      } else if (hasOriginal && !hasStorage) {
        stats.onlyOriginalUrl++;
        // 只有 original_url 没有 storage_path 是可疑的
        suspiciousRecords.push({
          ...video,
          issue: '只有临时URL，没有存储路径'
        });
      } else if (!hasOriginal && hasStorage) {
        stats.onlyStoragePath++;
      } else {
        stats.neither++;
        missingUrlRecords.push({
          ...video,
          issue: '既没有临时URL也没有存储路径'
        });
      }

      // 检查 URL 是否包含过期参数
      if (video.original_url) {
        if (
          video.original_url.includes('X-Tos-Expires=') ||
          video.original_url.includes('Expires=') ||
          video.original_url.includes('expires=')
        ) {
          stats.suspiciousUrl++;
        }
      }
    });

    // 输出统计信息
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 URL 状态统计`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`总记录数: ${stats.total}`);
    console.log(`有 original_url: ${stats.hasOriginalUrl} (${((stats.hasOriginalUrl/stats.total)*100).toFixed(1)}%)`);
    console.log(`有 storage_path: ${stats.hasStoragePath} (${((stats.hasStoragePath/stats.total)*100).toFixed(1)}%)`);
    console.log(`\n详细分类:`);
    console.log(`  ✅ 两者都有: ${stats.both}`);
    console.log(`  ⚠️  只有临时URL: ${stats.onlyOriginalUrl}`);
    console.log(`  ⚠️  只有存储路径: ${stats.onlyStoragePath}`);
    console.log(`  ❌ 两者都没有: ${stats.neither}`);
    console.log(`  🕐 URL包含过期参数: ${stats.suspiciousUrl}`);

    // 显示可疑记录
    if (suspiciousRecords.length > 0) {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`⚠️  可疑记录 (只有临时URL): ${suspiciousRecords.length} 条`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      suspiciousRecords.slice(0, 10).forEach((record, index) => {
        console.log(`\n━━━ 可疑记录 #${index + 1} ━━━`);
        console.log(`ID: ${record.id}`);
        console.log(`User: ${record.user_id}`);
        console.log(`Request ID: ${record.wavespeed_request_id}`);
        console.log(`Prompt: ${record.prompt?.substring(0, 50)}...`);
        console.log(`Original URL: ${record.original_url?.substring(0, 100)}...`);
        console.log(`Storage Path: ${record.storage_path || 'N/A'}`);
        console.log(`Created: ${record.created_at}`);
        console.log(`Updated: ${record.updated_at}`);
        console.log(`Issue: ${record.issue}`);
      });

      console.log(`\n💡 建议: 这些记录可能在 /admin/tasks 页面显示为"失败"，因为临时 URL 已过期`);
    }

    // 显示完全缺失 URL 的记录
    if (missingUrlRecords.length > 0) {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`❌ 缺失 URL 的记录: ${missingUrlRecords.length} 条`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      missingUrlRecords.forEach((record, index) => {
        console.log(`\n━━━ 缺失记录 #${index + 1} ━━━`);
        console.log(`ID: ${record.id}`);
        console.log(`User: ${record.user_id}`);
        console.log(`Created: ${record.created_at}`);
        console.log(`Issue: ${record.issue}`);
      });
    }

    // 检查最近的记录
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📅 最近 10 条 completed 记录的 URL 状态`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    completedVideos.slice(0, 10).forEach((video, index) => {
      const hasOriginal = !!video.original_url;
      const hasStorage = !!video.storage_path;
      const urlType = hasOriginal && hasStorage ? '✅ 两者都有' :
                      hasOriginal && !hasStorage ? '⚠️  只有临时URL' :
                      !hasOriginal && hasStorage ? '⚠️  只有存储' :
                      '❌ 都没有';

      console.log(`${index + 1}. [${video.created_at.split('T')[0]}] ${urlType}`);
      if (video.original_url && video.original_url.includes('X-Tos-Expires=')) {
        console.log(`   ⏰ 临时 URL 包含过期参数`);
      }
    });

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行检查
checkVideoUrlIssues()
  .then(() => {
    console.log('\n\n✅ 检查完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

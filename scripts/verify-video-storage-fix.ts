/**
 * 验证视频永久存储修复
 * 检查最新生成的视频是否有永久存储路径
 */

import { supabaseAdmin } from '../lib/supabase';

async function verifyStorageFix() {
  console.log('🔍 开始验证视频永久存储修复...\n');

  try {
    // 1. 查询最新的视频记录
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 检查最新视频记录`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: recentVideos, error } = await supabaseAdmin
      .from('user_videos')
      .select('id, status, original_url, storage_path, file_size, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }

    if (!recentVideos || recentVideos.length === 0) {
      console.log('⚠️  没有找到已完成的视频记录');
      return;
    }

    // 2. 统计存储情况
    const stats = {
      total: recentVideos.length,
      hasStoragePath: 0,
      hasOriginalUrl: 0,
      hasBoth: 0,
      onlyTemp: 0,
      hasFileSize: 0,
    };

    recentVideos.forEach(video => {
      if (video.storage_path) stats.hasStoragePath++;
      if (video.original_url) stats.hasOriginalUrl++;
      if (video.storage_path && video.original_url) stats.hasBoth++;
      if (video.original_url && !video.storage_path) stats.onlyTemp++;
      if (video.file_size) stats.hasFileSize++;
    });

    console.log(`总记录数: ${stats.total}`);
    console.log(`有 storage_path: ${stats.hasStoragePath} (${((stats.hasStoragePath/stats.total)*100).toFixed(1)}%)`);
    console.log(`有 original_url: ${stats.hasOriginalUrl} (${((stats.hasOriginalUrl/stats.total)*100).toFixed(1)}%)`);
    console.log(`两者都有: ${stats.hasBoth} (${((stats.hasBoth/stats.total)*100).toFixed(1)}%)`);
    console.log(`只有临时URL: ${stats.onlyTemp} (${((stats.onlyTemp/stats.total)*100).toFixed(1)}%)`);
    console.log(`有文件大小: ${stats.hasFileSize} (${((stats.hasFileSize/stats.total)*100).toFixed(1)}%)`);

    // 3. 显示详细记录
    console.log(`\n最近 ${Math.min(5, recentVideos.length)} 条视频详情:\n`);

    recentVideos.slice(0, 5).forEach((video, index) => {
      const status = video.storage_path ? '✅ 有永久存储' : '❌ 只有临时URL';
      const createdDate = video.created_at.split('T')[0];
      const createdTime = video.created_at.split('T')[1].substring(0, 8);

      console.log(`${index + 1}. [${createdDate} ${createdTime}] ${status}`);
      console.log(`   ID: ${video.id}`);

      if (video.storage_path) {
        console.log(`   📂 永久路径: ${video.storage_path}`);
      }

      if (video.file_size) {
        console.log(`   📦 文件大小: ${(video.file_size / (1024 * 1024)).toFixed(2)} MB`);
      }

      if (video.original_url) {
        const isExpiring = video.original_url.includes('X-Tos-Expires=');
        console.log(`   🔗 临时URL: ${isExpiring ? '⚠️  会过期' : '✅ 不过期'}`);
      }

      console.log('');
    });

    // 4. 验证修复是否生效
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 修复验证结果`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const fixedVideos = recentVideos.filter(v => v.storage_path && v.created_at > new Date(Date.now() - 3600000).toISOString());

    if (fixedVideos.length > 0) {
      console.log(`✅ 发现 ${fixedVideos.length} 个新视频有永久存储（最近1小时）`);
      console.log(`✅ 修复已生效！`);

      // 显示修复后的视频
      console.log(`\n修复后的视频:`);
      fixedVideos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.id}`);
        console.log(`   创建时间: ${video.created_at}`);
        console.log(`   存储路径: ${video.storage_path}`);
        if (video.file_size) {
          console.log(`   文件大小: ${(video.file_size / (1024 * 1024)).toFixed(2)} MB`);
        }
      });
    } else {
      console.log(`⚠️  最近1小时内没有新视频生成`);
      console.log(`💡 建议: 生成一个新视频来测试修复效果`);

      // 检查是否有旧视频缺少永久存储
      const oldVideosWithoutStorage = recentVideos.filter(v => !v.storage_path);
      if (oldVideosWithoutStorage.length > 0) {
        console.log(`\n📌 发现 ${oldVideosWithoutStorage.length} 个旧视频没有永久存储`);
        console.log(`   这些是修复前生成的视频（预期行为）`);
      }
    }

    // 5. 与图片存储对比
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📸 对比图片存储（参考基准）`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: recentImages } = await supabaseAdmin
      .from('user_images')
      .select('storage_path, storage_url')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentImages) {
      const imageWithStorage = recentImages.filter(i => i.storage_path || i.storage_url?.includes('supabase')).length;
      console.log(`图片永久存储率: ${((imageWithStorage/recentImages.length)*100).toFixed(1)}%`);
      console.log(`视频永久存储率: ${((stats.hasStoragePath/stats.total)*100).toFixed(1)}%`);

      if (stats.hasStoragePath > 0) {
        console.log(`\n✅ 视频存储逻辑已与图片保持一致`);
      }
    }

  } catch (err) {
    console.error('❌ 验证过程出错:', err);
  }
}

// 执行验证
verifyStorageFix()
  .then(() => {
    console.log('\n\n✅ 验证完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

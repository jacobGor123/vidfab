/**
 * 对比图片和视频的存储情况
 * 验证图片是否真的有永久存储
 */

import { supabaseAdmin } from '../lib/supabase';

async function compareStorage() {
  console.log('🔍 开始对比图片和视频的存储情况...\n');

  try {
    // 1. 检查图片存储
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📸 检查图片存储 (user_images 表)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: images, error: imageError } = await supabaseAdmin
      .from('user_images')
      .select('id, status, original_url, storage_url, storage_path, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (imageError) {
      console.error('❌ 查询图片失败:', imageError);
    } else {
      const imageStats = {
        total: images?.length || 0,
        hasStorageUrl: 0,
        hasStoragePath: 0,
        both: 0,
        onlyOriginal: 0,
        supabaseUrls: 0,
      };

      images?.forEach(img => {
        const hasStorage = !!img.storage_url;
        const hasPath = !!img.storage_path;
        const isSupabase = img.storage_url?.includes('supabase') || img.storage_url?.includes('storage');

        if (hasStorage) imageStats.hasStorageUrl++;
        if (hasPath) imageStats.hasStoragePath++;
        if (hasStorage && hasPath) imageStats.both++;
        if (!hasStorage && !hasPath) imageStats.onlyOriginal++;
        if (isSupabase) imageStats.supabaseUrls++;
      });

      console.log(`总记录数: ${imageStats.total}`);
      console.log(`有 storage_url: ${imageStats.hasStorageUrl} (${((imageStats.hasStorageUrl/imageStats.total)*100).toFixed(1)}%)`);
      console.log(`有 storage_path: ${imageStats.hasStoragePath} (${((imageStats.hasStoragePath/imageStats.total)*100).toFixed(1)}%)`);
      console.log(`两者都有: ${imageStats.both}`);
      console.log(`只有原始URL: ${imageStats.onlyOriginal}`);
      console.log(`Supabase 永久URL: ${imageStats.supabaseUrls} (${((imageStats.supabaseUrls/imageStats.total)*100).toFixed(1)}%)`);

      // 显示最近几条记录的详情
      console.log(`\n最近 5 条图片记录:`);
      images?.slice(0, 5).forEach((img, index) => {
        const urlType = img.storage_url?.includes('supabase') ? '✅ Supabase永久URL' :
                       img.storage_url?.includes('volces.com') ? '⚠️  BytePlus临时URL' :
                       '❓ 其他';
        console.log(`${index + 1}. [${img.created_at.split('T')[0]}] ${urlType}`);
        if (img.storage_path) {
          console.log(`   📂 Path: ${img.storage_path.substring(0, 60)}...`);
        }
      });
    }

    // 2. 检查视频存储
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎬 检查视频存储 (user_videos 表)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: videos, error: videoError } = await supabaseAdmin
      .from('user_videos')
      .select('id, status, original_url, storage_path, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (videoError) {
      console.error('❌ 查询视频失败:', videoError);
    } else {
      const videoStats = {
        total: videos?.length || 0,
        hasOriginalUrl: 0,
        hasStoragePath: 0,
        both: 0,
        onlyOriginal: 0,
      };

      videos?.forEach(video => {
        const hasOriginal = !!video.original_url;
        const hasPath = !!video.storage_path;

        if (hasOriginal) videoStats.hasOriginalUrl++;
        if (hasPath) videoStats.hasStoragePath++;
        if (hasOriginal && hasPath) videoStats.both++;
        if (hasOriginal && !hasPath) videoStats.onlyOriginal++;
      });

      console.log(`总记录数: ${videoStats.total}`);
      console.log(`有 original_url: ${videoStats.hasOriginalUrl} (${((videoStats.hasOriginalUrl/videoStats.total)*100).toFixed(1)}%)`);
      console.log(`有 storage_path: ${videoStats.hasStoragePath} (${((videoStats.hasStoragePath/videoStats.total)*100).toFixed(1)}%)`);
      console.log(`两者都有: ${videoStats.both}`);
      console.log(`只有临时URL: ${videoStats.onlyOriginal}`);

      console.log(`\n最近 5 条视频记录:`);
      videos?.slice(0, 5).forEach((video, index) => {
        const urlType = video.storage_path ? '✅ 有永久存储' : '❌ 只有临时URL';
        console.log(`${index + 1}. [${video.created_at.split('T')[0]}] ${urlType}`);
      });
    }

    // 3. 关键对比总结
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 关键差异对比`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const imageHasStorage = images ? images.filter(i => i.storage_path || i.storage_url?.includes('supabase')).length : 0;
    const videoHasStorage = videos ? videos.filter(v => v.storage_path).length : 0;

    const imageTotal = images?.length || 0;
    const videoTotal = videos?.length || 0;

    console.log(`图片 (user_images):`);
    console.log(`  ✅ 有永久存储: ${imageHasStorage}/${imageTotal} (${imageTotal > 0 ? ((imageHasStorage/imageTotal)*100).toFixed(1) : 0}%)`);
    console.log(`\n视频 (user_videos):`);
    console.log(`  ❌ 有永久存储: ${videoHasStorage}/${videoTotal} (${videoTotal > 0 ? ((videoHasStorage/videoTotal)*100).toFixed(1) : 0}%)`);

    console.log(`\n💡 结论:`);
    if (imageHasStorage > 0 && videoHasStorage === 0) {
      console.log(`  ⚠️  图片有下载和永久存储逻辑，但视频没有！`);
      console.log(`  ⚠️  这就是为什么图片不会出现 URL 过期问题，而视频会。`);
    }

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行对比
compareStorage()
  .then(() => {
    console.log('\n\n✅ 对比完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

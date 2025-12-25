/**
 * 查询失败的 image to video 记录
 * 用于分析线上环境的视频生成失败情况
 */

import { supabaseAdmin } from '../lib/supabase';

async function queryFailedVideos() {
  console.log('🔍 开始查询失败的 image to video 记录...\n');

  try {
    // 首先查看所有状态的分布
    const { data: allClips, error: allError } = await supabaseAdmin
      .from('project_video_clips')
      .select('id, status, video_status, error_message')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (allError) {
      console.error('❌ 查询失败:', allError);
      return;
    }

    // 统计状态分布
    const statusStats = new Map<string, number>();
    const videoStatusStats = new Map<string, number>();
    let errorCount = 0;

    allClips?.forEach(clip => {
      statusStats.set(clip.status, (statusStats.get(clip.status) || 0) + 1);
      if (clip.video_status) {
        videoStatusStats.set(clip.video_status, (videoStatusStats.get(clip.video_status) || 0) + 1);
      }
      if (clip.error_message) {
        errorCount++;
      }
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 最近 100 条记录的状态分布`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Status 字段分布:`);
    statusStats.forEach((count, status) => {
      console.log(`  ${status}: ${count} 条`);
    });
    console.log(`\nVideo Status 字段分布:`);
    videoStatusStats.forEach((count, status) => {
      console.log(`  ${status}: ${count} 条`);
    });
    console.log(`\n包含错误信息的记录: ${errorCount} 条\n`);

    // 查询有错误信息的记录
    const { data: errorClips, error: errorQueryError } = await supabaseAdmin
      .from('project_video_clips')
      .select(`
        id,
        project_id,
        shot_number,
        video_url,
        status,
        video_status,
        seedance_task_id,
        video_request_id,
        error_message,
        created_at,
        updated_at
      `)
      .not('error_message', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (errorQueryError) {
      console.error('❌ 查询错误记录失败:', errorQueryError);
      return;
    }

    // 同时查询 video_status 为 failed 的记录
    const { data: videoStatusFailed, error: videoStatusError } = await supabaseAdmin
      .from('project_video_clips')
      .select(`
        id,
        project_id,
        shot_number,
        video_url,
        status,
        video_status,
        seedance_task_id,
        video_request_id,
        error_message,
        created_at,
        updated_at
      `)
      .eq('video_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (videoStatusError) {
      console.error('❌ 查询 video_status=failed 失败:', videoStatusError);
    }

    // 合并所有失败记录
    const failedClips = [
      ...(errorClips || []),
      ...(videoStatusFailed || [])
    ].reduce((acc, clip) => {
      if (!acc.find(c => c.id === clip.id)) {
        acc.push(clip);
      }
      return acc;
    }, [] as typeof errorClips);

    if (!failedClips || failedClips.length === 0) {
      console.log('✅ 没有找到失败的视频记录');
      return;
    }

    console.log(`📊 找到 ${failedClips.length} 条失败记录:\n`);

    // 统计失败原因
    const errorStats = new Map<string, number>();

    failedClips.forEach((clip, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`记录 #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${clip.id}`);
      console.log(`Project ID: ${clip.project_id}`);
      console.log(`Shot Number: ${clip.shot_number}`);
      console.log(`Status: ${clip.status}`);
      console.log(`Video Status: ${clip.video_status || 'N/A'}`);
      console.log(`Task ID: ${clip.seedance_task_id || 'N/A'}`);
      console.log(`Request ID: ${clip.video_request_id || 'N/A'}`);
      console.log(`Error Message: ${clip.error_message || 'N/A'}`);
      console.log(`Created At: ${clip.created_at}`);
      console.log(`Updated At: ${clip.updated_at}`);

      // 统计错误类型
      const errorKey = clip.error_message || 'Unknown Error';
      errorStats.set(errorKey, (errorStats.get(errorKey) || 0) + 1);
    });

    // 输出错误统计
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 错误类型统计`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const sortedErrors = Array.from(errorStats.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedErrors.forEach(([error, count]) => {
      console.log(`[${count}次] ${error}`);
    });

    // 查询这些失败记录对应的项目信息
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 关联项目信息`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const projectIds = [...new Set(failedClips.map(c => c.project_id))];

    const { data: projects } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id, user_id, story_style, aspect_ratio, image_style, step_4_status, created_at')
      .in('id', projectIds);

    projects?.forEach(project => {
      const relatedClips = failedClips.filter(c => c.project_id === project.id);
      console.log(`\nProject: ${project.id}`);
      console.log(`User: ${project.user_id}`);
      console.log(`Story Style: ${project.story_style}`);
      console.log(`Image Style: ${project.image_style || 'N/A'}`);
      console.log(`Aspect Ratio: ${project.aspect_ratio}`);
      console.log(`Step 4 Status: ${project.step_4_status || 'N/A'}`);
      console.log(`Failed Clips: ${relatedClips.length} 个镜头失败`);
      console.log(`Created At: ${project.created_at}`);
    });

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行查询
queryFailedVideos()
  .then(() => {
    console.log('\n\n✅ 查询完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

/**
 * 查询所有失败记录(包括 storyboard 和 video)
 * 用于全面分析线上环境的失败情况
 */

import { supabaseAdmin } from '../lib/supabase';

async function queryAllFailures() {
  console.log('🔍 开始全面查询失败记录...\n');

  try {
    // 1. 查询 storyboard 失败记录
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📸 查询 Storyboard 生成记录`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: allStoryboards, error: storyboardError } = await supabaseAdmin
      .from('project_storyboards')
      .select('id, status, error_message')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (storyboardError) {
      console.error('❌ 查询 storyboard 失败:', storyboardError);
    } else {
      const storyboardStatusStats = new Map<string, number>();
      let storyboardErrorCount = 0;

      allStoryboards?.forEach(sb => {
        storyboardStatusStats.set(sb.status, (storyboardStatusStats.get(sb.status) || 0) + 1);
        if (sb.error_message) {
          storyboardErrorCount++;
        }
      });

      console.log(`最近 100 条 Storyboard 记录的状态分布:`);
      storyboardStatusStats.forEach((count, status) => {
        console.log(`  ${status}: ${count} 条`);
      });
      console.log(`包含错误信息的记录: ${storyboardErrorCount} 条\n`);

      // 查询失败状态或有错误的 storyboard
      const { data: failedStoryboards, error: failedSbError } = await supabaseAdmin
        .from('project_storyboards')
        .select(`
          id,
          project_id,
          shot_number,
          image_url,
          status,
          error_message,
          created_at,
          updated_at
        `)
        .or('status.eq.failed,error_message.not.is.null')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (failedSbError) {
        console.error('❌ 查询失败的 storyboard 记录出错:', failedSbError);
      }

      if (failedStoryboards && failedStoryboards.length > 0) {
        console.log(`\n找到 ${failedStoryboards.length} 条有错误的 Storyboard 记录:\n`);

        const errorStats = new Map<string, number>();

        failedStoryboards.forEach((sb, index) => {
          console.log(`\n━━━ Storyboard 记录 #${index + 1} ━━━`);
          console.log(`ID: ${sb.id}`);
          console.log(`Project ID: ${sb.project_id}`);
          console.log(`Shot Number: ${sb.shot_number}`);
          console.log(`Status: ${sb.status}`);
          console.log(`Image URL: ${sb.image_url}`);
          console.log(`Error: ${sb.error_message}`);
          console.log(`Created: ${sb.created_at}`);
          console.log(`Updated: ${sb.updated_at}`);

          const errorKey = sb.error_message || 'Unknown Error';
          errorStats.set(errorKey, (errorStats.get(errorKey) || 0) + 1);
        });

        console.log(`\n\n📈 Storyboard 错误类型统计:`);
        const sortedErrors = Array.from(errorStats.entries()).sort((a, b) => b[1] - a[1]);
        sortedErrors.forEach(([error, count]) => {
          console.log(`[${count}次] ${error}`);
        });
      }
    }

    // 2. 查询 video clips 失败记录
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎬 查询 Video Clips 生成记录`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: allVideos, error: videoError } = await supabaseAdmin
      .from('project_video_clips')
      .select('id, status, video_status, error_message')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (videoError) {
      console.error('❌ 查询 video clips 失败:', videoError);
    } else {
      const videoStatusStats = new Map<string, number>();
      const videoVideoStatusStats = new Map<string, number>();
      let videoErrorCount = 0;

      allVideos?.forEach(v => {
        videoStatusStats.set(v.status, (videoStatusStats.get(v.status) || 0) + 1);
        if (v.video_status) {
          videoVideoStatusStats.set(v.video_status, (videoVideoStatusStats.get(v.video_status) || 0) + 1);
        }
        if (v.error_message) {
          videoErrorCount++;
        }
      });

      console.log(`最近 100 条 Video Clips 记录的状态分布:`);
      console.log(`\nStatus 字段:`);
      videoStatusStats.forEach((count, status) => {
        console.log(`  ${status}: ${count} 条`);
      });
      console.log(`\nVideo Status 字段:`);
      videoVideoStatusStats.forEach((count, status) => {
        console.log(`  ${status}: ${count} 条`);
      });
      console.log(`\n包含错误信息的记录: ${videoErrorCount} 条\n`);

      // 查询有错误的 video clips
      const { data: failedVideos } = await supabaseAdmin
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

      if (failedVideos && failedVideos.length > 0) {
        console.log(`\n找到 ${failedVideos.length} 条有错误的 Video Clips 记录:\n`);

        const errorStats = new Map<string, number>();

        failedVideos.forEach((v, index) => {
          console.log(`\n━━━ Video Clip 记录 #${index + 1} ━━━`);
          console.log(`ID: ${v.id}`);
          console.log(`Project ID: ${v.project_id}`);
          console.log(`Shot Number: ${v.shot_number}`);
          console.log(`Status: ${v.status}`);
          console.log(`Video Status: ${v.video_status || 'N/A'}`);
          console.log(`Task ID: ${v.seedance_task_id || 'N/A'}`);
          console.log(`Request ID: ${v.video_request_id || 'N/A'}`);
          console.log(`Error: ${v.error_message}`);
          console.log(`Created: ${v.created_at}`);
          console.log(`Updated: ${v.updated_at}`);

          const errorKey = v.error_message || 'Unknown Error';
          errorStats.set(errorKey, (errorStats.get(errorKey) || 0) + 1);
        });

        console.log(`\n\n📈 Video Clips 错误类型统计:`);
        const sortedErrors = Array.from(errorStats.entries()).sort((a, b) => b[1] - a[1]);
        sortedErrors.forEach(([error, count]) => {
          console.log(`[${count}次] ${error}`);
        });
      }
    }

    // 3. 查询项目的整体状态
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 查询项目状态分布`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: projects } = await supabaseAdmin
      .from('video_agent_projects')
      .select(`
        id,
        status,
        current_step,
        step_1_status,
        step_2_status,
        step_3_status,
        step_4_status,
        step_5_status,
        step_6_status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (projects) {
      const projectStatusStats = new Map<string, number>();
      const step4Stats = new Map<string, number>();

      projects.forEach(p => {
        projectStatusStats.set(p.status, (projectStatusStats.get(p.status) || 0) + 1);
        if (p.step_4_status) {
          step4Stats.set(p.step_4_status, (step4Stats.get(p.step_4_status) || 0) + 1);
        }
      });

      console.log(`最近 50 个项目的状态分布:`);
      projectStatusStats.forEach((count, status) => {
        console.log(`  ${status}: ${count} 个`);
      });

      console.log(`\nStep 4 (视频生成) 状态分布:`);
      step4Stats.forEach((count, status) => {
        console.log(`  ${status}: ${count} 个`);
      });
    }

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行查询
queryAllFailures()
  .then(() => {
    console.log('\n\n✅ 查询完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

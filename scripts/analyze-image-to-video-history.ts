/**
 * 全面分析 image to video 的历史记录
 * 包括所有状态、转换过程、以及可能的问题
 */

import { supabaseAdmin } from '../lib/supabase';

async function analyzeImageToVideoHistory() {
  console.log('🔍 开始分析 Image to Video 历史记录...\n');

  try {
    // 1. 查询所有历史记录（包括已删除的）
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 查询所有历史记录 (最近 200 条)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: allRecords, error } = await supabaseAdmin
      .from('user_videos')
      .select(`
        id,
        user_id,
        status,
        error_message,
        download_progress,
        settings,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('❌ 没有找到任何记录');
      return;
    }

    // 统计各种状态
    const statusStats = new Map<string, number>();
    const statusTransitions = new Map<string, number>();
    const errorRecords: any[] = [];
    const suspiciousRecords: any[] = [];

    allRecords.forEach(record => {
      // 统计状态
      statusStats.set(record.status, (statusStats.get(record.status) || 0) + 1);

      // 收集有错误信息的记录
      if (record.error_message) {
        errorRecords.push(record);
      }

      // 收集可疑记录（下载进度不完整等）
      if (record.status === 'downloading' && record.download_progress < 100) {
        suspiciousRecords.push({
          ...record,
          reason: '下载未完成'
        });
      }
      if (record.status === 'processing') {
        suspiciousRecords.push({
          ...record,
          reason: '处理中状态'
        });
      }
      if (record.status === 'generating') {
        suspiciousRecords.push({
          ...record,
          reason: '生成中状态'
        });
      }
    });

    console.log(`总记录数: ${allRecords.length}`);
    console.log(`\n状态分布:`);
    const sortedStatus = Array.from(statusStats.entries()).sort((a, b) => b[1] - a[1]);
    sortedStatus.forEach(([status, count]) => {
      const percentage = ((count / allRecords.length) * 100).toFixed(2);
      console.log(`  ${status}: ${count} 条 (${percentage}%)`);
    });

    console.log(`\n有错误信息的记录: ${errorRecords.length} 条`);
    console.log(`可疑记录: ${suspiciousRecords.length} 条`);

    // 2. 显示错误记录详情
    if (errorRecords.length > 0) {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`❌ 错误记录详情 (${errorRecords.length} 条)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const errorStats = new Map<string, number>();

      errorRecords.forEach((record, index) => {
        console.log(`\n━━━ 错误记录 #${index + 1} ━━━`);
        console.log(`ID: ${record.id}`);
        console.log(`User: ${record.user_id}`);
        console.log(`Status: ${record.status}`);
        console.log(`Error: ${record.error_message}`);
        console.log(`Download Progress: ${record.download_progress}%`);
        console.log(`Created: ${record.created_at}`);
        console.log(`Updated: ${record.updated_at}`);

        errorStats.set(record.error_message, (errorStats.get(record.error_message) || 0) + 1);
      });

      console.log(`\n\n📈 错误类型统计:`);
      const sortedErrors = Array.from(errorStats.entries()).sort((a, b) => b[1] - a[1]);
      sortedErrors.forEach(([error, count]) => {
        console.log(`[${count}次] ${error}`);
      });
    }

    // 3. 显示可疑记录
    if (suspiciousRecords.length > 0) {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`⚠️  可疑记录详情 (${suspiciousRecords.length} 条)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const reasonStats = new Map<string, number>();

      suspiciousRecords.slice(0, 20).forEach((record, index) => {
        console.log(`\n━━━ 可疑记录 #${index + 1} ━━━`);
        console.log(`ID: ${record.id}`);
        console.log(`User: ${record.user_id}`);
        console.log(`Status: ${record.status}`);
        console.log(`Reason: ${record.reason}`);
        console.log(`Download Progress: ${record.download_progress}%`);
        console.log(`Created: ${record.created_at}`);
        console.log(`Updated: ${record.updated_at}`);

        const timeDiff = new Date(record.updated_at).getTime() - new Date(record.created_at).getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        console.log(`Time elapsed: ${hours} 小时`);

        reasonStats.set(record.reason, (reasonStats.get(record.reason) || 0) + 1);
      });

      console.log(`\n\n📊 可疑原因统计:`);
      reasonStats.forEach((count, reason) => {
        console.log(`[${count}次] ${reason}`);
      });
    }

    // 4. 时间分析 - 查看最近几天的趋势
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📅 最近7天的记录趋势`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const dailyStats = new Map<string, { total: number; completed: number; failed: number; deleted: number }>();

    allRecords.forEach(record => {
      const date = record.created_at.split('T')[0];
      const stats = dailyStats.get(date) || { total: 0, completed: 0, failed: 0, deleted: 0 };
      stats.total++;
      if (record.status === 'completed') stats.completed++;
      if (record.status === 'failed') stats.failed++;
      if (record.status === 'deleted') stats.deleted++;
      dailyStats.set(date, stats);
    });

    const sortedDates = Array.from(dailyStats.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    sortedDates.slice(0, 7).forEach(([date, stats]) => {
      const successRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : '0.00';
      console.log(`${date}: 总计 ${stats.total} | 完成 ${stats.completed} | 失败 ${stats.failed} | 删除 ${stats.deleted} | 成功率 ${successRate}%`);
    });

  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 执行分析
analyzeImageToVideoHistory()
  .then(() => {
    console.log('\n\n✅ 分析完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });

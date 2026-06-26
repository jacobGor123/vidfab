/**
 * 视频合成任务健康检查器
 *
 * 功能：
 * 1. 定期扫描所有 processing 状态的项目
 * 2. 检测"僵尸任务"（数据库为 processing 但队列中无任务）
 * 3. 自动恢复或标记为失败
 */

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { redisBullMQ } from '@/lib/redis-bullmq';
import { normalizeBullMQJobId } from '@/lib/queue/job-id';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 使用统一的 Redis 连接配置（支持 Upstash）
const queue = new Queue('video-agent', { connection: redisBullMQ });

interface ZombieJob {
  projectId: string;
  status: string;
  step_6_status: string;
  updated_at: string;
  stuckDuration: number; // 卡住的时长（分钟）
}

/**
 * 检测僵尸任务
 */
export async function detectZombieJobs(): Promise<ZombieJob[]> {
  const STUCK_THRESHOLD_MS = 20 * 60 * 1000; // 20 分钟

  // 1. 查询所有 processing 状态的项目
  const { data: projects, error } = await supabase
    .from('video_agent_projects')
    .select('id, status, step_6_status, updated_at')
    .eq('step_6_status', 'processing');

  if (error || !projects) {
    console.error('[HealthCheck] Failed to query projects:', error);
    return [];
  }

  const zombies: ZombieJob[] = [];
  const now = Date.now();

  for (const project of projects) {
    const jobId = normalizeBullMQJobId(`va:compose:${project.id}`);

    // 2. 检查队列中是否存在任务
    const job = await queue.getJob(jobId);

    if (!job) {
      // 3. 计算卡住时长
      const updatedAt = new Date(project.updated_at).getTime();
      const stuckDuration = now - updatedAt;

      if (stuckDuration > STUCK_THRESHOLD_MS) {
        zombies.push({
          projectId: project.id,
          status: project.status,
          step_6_status: project.step_6_status,
          updated_at: project.updated_at,
          stuckDuration: Math.round(stuckDuration / 1000 / 60), // 转换为分钟
        });
      }
    }
  }

  return zombies;
}

/**
 * 恢复僵尸任务
 */
export async function recoverZombieJob(projectId: string): Promise<void> {
  console.log(`[HealthCheck] 🔧 Recovering zombie job: ${projectId}`);

  // 策略1：尝试从已完成的队列中恢复结果
  const jobId = normalizeBullMQJobId(`va:compose:${projectId}`);
  const completed = await queue.getCompleted();
  const failed = await queue.getFailed();

  const completedJob = completed.find((j) => j.id === jobId);
  const failedJob = failed.find((j) => j.id === jobId);

  if (completedJob?.returnvalue) {
    // 如果在已完成队列中找到，恢复结果
    console.log(`[HealthCheck] ✅ Found completed job, restoring result`);

    const result = completedJob.returnvalue.data || completedJob.returnvalue;

    if (result?.composed && result.video?.url) {
      await supabase
        .from('video_agent_projects')
        .update({
          status: 'completed',
          step_6_status: 'completed',
          final_video_url: result.video.url,
          final_video_file_size: result.video.fileSize,
          final_video_resolution: result.video.resolution,
          final_video_storage_path: `shotstack:${projectId}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      console.log(`[HealthCheck] ✅ Zombie job recovered successfully`);
      return;
    }
  }

  if (failedJob) {
    // 如果在失败队列中找到，标记为失败
    console.log(`[HealthCheck] ❌ Found failed job, marking as failed`);

    await supabase
      .from('video_agent_projects')
      .update({
        status: 'failed',
        step_6_status: 'failed',
      })
      .eq('id', projectId);

    console.log(`[HealthCheck] ✅ Zombie job marked as failed`);
    return;
  }

  // 策略2：如果队列中完全找不到，标记为失败并允许重试
  console.log(`[HealthCheck] ⚠️ Job not found anywhere, marking as failed (retryable)`);

  await supabase
    .from('video_agent_projects')
    .update({
      status: 'failed',
      step_6_status: 'failed',
    })
    .eq('id', projectId);

  console.log(`[HealthCheck] ✅ Zombie job marked as failed (user can retry)`);
}

/**
 * 运行健康检查
 */
export async function runHealthCheck(): Promise<void> {
  console.log('[HealthCheck] 🏥 Starting job health check...');

  try {
    const zombies = await detectZombieJobs();

    if (zombies.length === 0) {
      console.log('[HealthCheck] ✅ No zombie jobs found');
      return;
    }

    console.log(`[HealthCheck] ⚠️ Found ${zombies.length} zombie job(s):`);
    zombies.forEach((z) => {
      console.log(`  - ${z.projectId} (stuck for ${z.stuckDuration} minutes)`);
    });

    // 自动恢复所有僵尸任务
    for (const zombie of zombies) {
      await recoverZombieJob(zombie.projectId);
    }

    console.log('[HealthCheck] ✅ Health check completed');
  } catch (error) {
    console.error('[HealthCheck] ❌ Health check failed:', error);
  }
}

/**
 * 启动定时健康检查（每5分钟一次）
 */
export function startHealthCheckDaemon(): void {
  console.log('[HealthCheck] 🚀 Starting health check daemon (every 5 minutes)...');

  // 立即执行一次
  runHealthCheck();

  // 每5分钟执行一次
  setInterval(runHealthCheck, 5 * 60 * 1000);
}

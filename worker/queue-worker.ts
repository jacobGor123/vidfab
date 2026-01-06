/**
 * BullMQ Worker 主程序
 * VidFab AI Video Platform
 *
 * 用于处理队列中的任务（包括分镜图生成）
 */

// 🔥 加载环境变量（Worker 运行在独立进程中，需要手动加载）
import dotenv from 'dotenv'
import { resolve } from 'path'

// 加载 .env.local（开发环境）
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
// 加载 .env（生产环境兜底）
dotenv.config()

import { videoQueueManager } from '../lib/queue/queue-manager'

async function main() {
  console.log('🚀 Starting VidFab BullMQ Worker...')
  console.log('Environment:', process.env.NODE_ENV || 'development')

  try {
    // 启动 Worker
    await videoQueueManager.startWorker({
      onActive: (job) => {
        console.log(`🔥 Processing job: ${job.type}`, {
          userId: job.userId,
          videoId: job.videoId,
          jobId: job.jobId
        })
      },

      onProgress: (job, progress) => {
        console.log(`⏳ Progress: ${progress.percent}% - ${progress.message}`, {
          jobType: job.type,
          jobId: job.jobId
        })
      },

      onCompleted: (job, result) => {
        console.log(`✅ Completed: ${job.type}`, {
          jobId: job.jobId,
          duration: result.duration,
          retries: result.retryCount
        })
      },

      onFailed: (job, error) => {
        console.error(`❌ Failed: ${job.type}`, {
          jobId: job.jobId,
          error: error.message
        })
      },

      onStalled: (job) => {
        console.warn(`⚠️  Stalled: ${job.type}`, {
          jobId: job.jobId
        })
      }
    })

    console.log('✅ Worker started successfully')
    console.log('Waiting for jobs...')

    // 优雅关闭
    const shutdown = async () => {
      console.log('\n🛑 Shutting down worker...')
      await videoQueueManager.stopWorker()
      await videoQueueManager.cleanup()
      console.log('✅ Worker stopped gracefully')
      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

  } catch (error) {
    console.error('❌ Worker startup failed:', error)
    process.exit(1)
  }
}

// 启动 Worker
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

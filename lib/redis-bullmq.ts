/**
 * Redis 配置 for BullMQ Queue System
 * VidFab AI Video Platform
 *
 * BullMQ 需要 ioredis 协议，因此这里提供兼容配置
 */

import Redis from 'ioredis'

/**
 * 为 BullMQ 创建 Redis 连接
 *
 * 开发环境：使用本地 Redis (redis://localhost:6379)
 * 生产环境：使用 Upstash Redis Protocol
 *
 * 环境变量配置：
 * - BULLMQ_REDIS_URL: 完整的 Redis 连接字符串（优先级最高）
 * - UPSTASH_REDIS_URL: Upstash Redis Protocol URL (rediss://...)
 * - REDIS_URL: 本地或其他 Redis URL (redis://...)
 */
const getBullMQRedisConfig = () => {
  // 🔥 BullMQ 推荐配置：防止无限重试导致请求爆炸
  const commonConfig = {
    maxRetriesPerRequest: 10, // 🔥 增加重试次数，应对 Upstash 远程连接不稳定
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      // 重试策略：指数退避，最多重试 20 次
      if (times > 20) {
        console.error('[BullMQ Redis] ❌ Max retries reached, giving up')
        return null // 停止重试
      }
      const delay = Math.min(times * 200, 5000) // 最多等待 5 秒
      console.warn(`[BullMQ Redis] ⚠️ Retry ${times} in ${delay}ms`)
      return delay
    },
    enableOfflineQueue: true, // 🔥 修复：启用离线队列，允许连接恢复后继续执行
    lazyConnect: false, // 立即连接
    keepAlive: 30000, // 保持连接活跃 (30秒)
    connectTimeout: 10000, // 连接超时 (10秒)
    commandTimeout: 10000, // 命令超时 (10秒)
  }

  // 优先级 1: 专门为 BullMQ 配置的 Redis
  if (process.env.BULLMQ_REDIS_URL) {
    return {
      url: process.env.BULLMQ_REDIS_URL,
      ...commonConfig,
    }
  }

  // 优先级 2: Upstash Redis Protocol (生产环境推荐)
  // 格式: rediss://default:password@hostname:6380
  if (process.env.UPSTASH_REDIS_URL) {
    return {
      url: process.env.UPSTASH_REDIS_URL,
      ...commonConfig,
      tls: {
        rejectUnauthorized: false, // Upstash 使用自签名证书
      },
    }
  }

  // 优先级 3: 本地或其他 Redis (开发环境)
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      ...commonConfig,
    }
  }

  // 默认：本地 Redis
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    ...commonConfig,
  }
}

const config = getBullMQRedisConfig()

// 验证配置
if (!config.url && !config.host) {
  console.error(`
❌ [BullMQ Redis] No Redis configuration found!

Current environment variables:
  - BULLMQ_REDIS_URL: ${process.env.BULLMQ_REDIS_URL ? '✓ Set' : '✗ Not set'}
  - UPSTASH_REDIS_URL: ${process.env.UPSTASH_REDIS_URL ? '✓ Set' : '✗ Not set'}
  - REDIS_URL: ${process.env.REDIS_URL ? '✓ Set' : '✗ Not set'}
  - REDIS_HOST: ${process.env.REDIS_HOST ? '✓ Set' : '✗ Not set'}

⚠️  Note: UPSTASH_REDIS_REST_URL (https://...) cannot be used with BullMQ!
    You need Redis Protocol URL (redis:// or rediss://)

Please configure one of the following:
  1. BULLMQ_REDIS_URL="rediss://default:password@your-host:6380"
  2. UPSTASH_REDIS_URL="rediss://default:password@your-host:6380"
  3. REDIS_URL="redis://localhost:6379" (for local development)

See: docs/queue-setup-guide.md for detailed instructions
  `)
}

// 🔥 为 Queue 创建连接（有限重试，防止请求爆炸）
export const redisBullMQ = config.url
  ? new Redis(config.url, {
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      retryStrategy: config.retryStrategy,
      enableOfflineQueue: config.enableOfflineQueue,
      tls: config.tls,
    })
  : new Redis(config)

// 🔥 为 Worker 创建连接（必须 null，BullMQ 要求）
export const redisBullMQWorker = config.url
  ? new Redis(config.url, {
      maxRetriesPerRequest: null,  // Worker 必须是 null（BullMQ 要求）
      enableReadyCheck: false,
      retryStrategy: config.retryStrategy,  // 保留连接级别的重试
      enableOfflineQueue: true,  // 🔥 修复：启用离线队列
      lazyConnect: false,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 10000,
      tls: config.tls,
    })
  : new Redis({
      ...config,
      maxRetriesPerRequest: null,  // Worker 必须是 null
      enableOfflineQueue: true,  // 🔥 修复：启用离线队列
    })

// 连接事件处理 - Queue
redisBullMQ.on('connect', () => {
  console.log('[BullMQ Redis Queue] ✅ Connected')
})

redisBullMQ.on('ready', () => {
  console.log('[BullMQ Redis Queue] ✅ Ready')
})

redisBullMQ.on('error', (error) => {
  console.error('[BullMQ Redis Queue] ❌ Error:', error)
})

redisBullMQ.on('close', () => {
  console.log('[BullMQ Redis Queue] 🔌 Closed')
})

// 连接事件处理 - Worker
redisBullMQWorker.on('connect', () => {
  console.log('[BullMQ Redis Worker] ✅ Connected')
})

redisBullMQWorker.on('ready', () => {
  console.log('[BullMQ Redis Worker] ✅ Ready to process jobs')
})

redisBullMQWorker.on('error', (error) => {
  console.error('[BullMQ Redis Worker] ❌ Error:', error)
})

redisBullMQWorker.on('close', () => {
  console.log('[BullMQ Redis Worker] 🔌 Closed')
})

// 健康检查
export async function checkBullMQRedisHealth(): Promise<boolean> {
  try {
    const result = await redisBullMQ.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('[BullMQ Redis] Health check failed:', error)
    return false
  }
}

// 优雅关闭
export async function closeBullMQRedisConnection(): Promise<void> {
  try {
    await Promise.all([
      redisBullMQ.quit(),
      redisBullMQWorker.quit()
    ])
    console.log('[BullMQ Redis] ✅ All connections closed gracefully')
  } catch (error) {
    console.error('[BullMQ Redis] Error closing connections:', error)
  }
}

export default redisBullMQ

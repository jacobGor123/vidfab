/**
 * Worker 健康检查 API
 * 用于监控 Worker 是否正常运行
 */

import { NextResponse } from 'next/server'
import { checkBullMQRedisHealth } from '@/lib/redis-bullmq'

// 🔥 强制动态渲染，避免构建时尝试连接Redis
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const redisHealthy = await checkBullMQRedisHealth()

    return NextResponse.json({
      status: redisHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy,
      timestamp: new Date().toISOString()
    }, {
      status: redisHealthy ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}

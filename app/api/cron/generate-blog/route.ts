/**
 * Vercel Cron API Route - Blog Generation
 * Triggered daily at 10:00 UTC by Vercel Cron
 * See vercel.json for cron configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/logger'
import { RedisCache, checkRedisHealth } from '@/lib/redis-upstash'

// Set runtime to Node.js (required for Inngest)
export const runtime = 'nodejs'

// Maximum execution time (5 minutes)
export const maxDuration = 300

/**
 * Cron job handler
 * Vercel automatically sends Authorization header for cron requests
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ✅ 只允许生产环境执行，避免 Preview/Dev 部署触发
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
      logger.info('Cron job skipped: non-production Vercel environment', {
        vercelEnv: process.env.VERCEL_ENV,
      })
      return new NextResponse(null, { status: 204 })
    }

    // ✅ 生产环境也要防止“部署后补跑”导致的重复触发
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA
    if (deploymentId) {
      const lockKey = `cron:generate-blog:deployment:${deploymentId}`
      const redisHealthy = await checkRedisHealth()

      if (redisHealthy) {
        const alreadyTriggered = await RedisCache.exists(lockKey)
        if (alreadyTriggered) {
          logger.info('Cron job skipped: already triggered for this deployment', {
            deploymentId,
            lockKey,
          })
          return new NextResponse(null, { status: 204 })
        }

        // 设置 15 分钟冷却锁（秒）
        await RedisCache.set(lockKey, true, 15 * 60)
        logger.info('Cron deployment lock set', {
          deploymentId,
          lockKey,
          ttlSeconds: 15 * 60,
        })
      } else {
        logger.warn('Redis unhealthy: skip deployment cooldown lock', {
          deploymentId,
        })
      }
    } else {
      logger.warn('Missing Vercel deployment identifiers; cannot apply cooldown lock')
    }

    // Log cron job start with environment info
    logger.info('Cron job triggered: generate-blog', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      hasInngestKey: !!process.env.INNGEST_EVENT_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    })

    // Validate required environment variables
    if (!process.env.INNGEST_EVENT_KEY) {
      const errorMsg = 'INNGEST_EVENT_KEY is not configured'
      logger.error(errorMsg)
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          hint: 'Please configure INNGEST_EVENT_KEY in Vercel environment variables',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    // Trigger Inngest function
    const result = await inngest.send({
      name: 'blog/generate.requested',
      data: {
        force: false,
        source: 'cron', // 🔒 明确标识：Vercel Cron 触发
      },
    })

    const duration = Date.now() - startTime

    logger.info('Blog generation job queued successfully', {
      eventIds: result.ids,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    // Return detailed response
    return NextResponse.json({
      success: true,
      message: 'Blog generation job queued successfully',
      eventIds: result.ids,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      nextSteps: {
        checkLogs: 'https://www.inngest.com/dashboard',
        functionName: 'generate-blog-article',
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('Cron job failed', error, {
      duration: `${duration}ms`,
      errorType: error instanceof Error ? error.name : typeof error,
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack:
          error instanceof Error && process.env.NODE_ENV !== 'production'
            ? error.stack
            : undefined,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          docs: '/docs/cron-job-diagnostic.md',
          checkEnvVars: [
            'INNGEST_EVENT_KEY',
            'INNGEST_SIGNING_KEY',
            'ANTHROPIC_API_KEY',
          ],
        },
      },
      { status: 500 }
    )
  }
}

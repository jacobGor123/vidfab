/**
 * Vercel Cron API Route - Blog Generation
 * Triggered daily at 10:00 UTC by Vercel Cron
 * See vercel.json for cron configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/logger'

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

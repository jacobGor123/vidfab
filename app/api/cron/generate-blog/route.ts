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
  try {
    logger.info('Cron job triggered: generate-blog')

    // Trigger Inngest function
    const result = await inngest.send({
      name: 'blog/generate.requested',
      data: {
        force: false,
      },
    })

    logger.info('Blog generation job queued', { eventIds: result.ids })

    return NextResponse.json({
      success: true,
      message: 'Blog generation job queued',
      eventIds: result.ids,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Cron job failed', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

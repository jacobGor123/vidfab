/**
 * Video Agent - Sync video generation status (enqueue)
 * POST: Enqueue a background job to sync provider status for all clips.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { videoQueueManager } from '@/lib/queue/queue-manager'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const jobId = `va:sync:${projectId}`

    const queuedId = await videoQueueManager.addJob(
      'va_sync_video_status',
      {
        type: 'va_sync_video_status',
        jobId,
        userId,
        videoId: projectId,
        projectId,
        createdAt: now,
      } as any,
      {
        priority: 'normal',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        jobId: queuedId || jobId,
        queuedAt: now,
      },
    })
  } catch (error) {
    console.error('[Video Agent] Failed to enqueue videos sync:', error)
    return NextResponse.json(
      {
        error: 'Failed to enqueue videos sync',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    )
  }
})

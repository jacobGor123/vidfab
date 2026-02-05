/**
 * Cron Job: 补救 pending 状态的分镜图下载
 * 每12小时执行一次，查找所有 pending 且超过 1 小时的分镜图，重新入队下载
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { videoQueueManager } from '@/lib/queue/queue-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔒 验证 Cron Secret（防止未授权访问）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting pending storyboards download check...')

    // 查找所有 pending 且超过 1 小时的分镜图（is_current=true，保存所有版本）
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: pendingStoryboards, error: queryError } = await supabaseAdmin
      .from('project_storyboards')
      .select('id, project_id, shot_number, image_url_external, user_id')
      .eq('status', 'success')  // 只处理生成成功的
      .eq('is_current', true)   // 只下载当前版本（历史版本依赖代理服务器）
      .eq('storage_status', 'pending')
      .lt('updated_at', oneHourAgo)
      .limit(100)  // 每次最多处理 100 个，避免超时

    if (queryError) {
      throw queryError
    }

    if (!pendingStoryboards || pendingStoryboards.length === 0) {
      console.log('[Cron] No pending storyboards found')
      return NextResponse.json({
        success: true,
        message: 'No pending storyboards to download',
        requeued: 0
      })
    }

    console.log(`[Cron] Found ${pendingStoryboards.length} pending storyboards`)

    // 🛡️ 批量重新入队（使用版本 ID 确保唯一性）
    const results = await Promise.allSettled(
      pendingStoryboards.map(async (sb) => {
        const uniqueJobId = `storyboard_download_retry_${sb.project_id}_${sb.shot_number}_${sb.id}`

        return videoQueueManager.addJob(
          'storyboard_download',
          {
            jobId: uniqueJobId,
            userId: sb.user_id,
            videoId: sb.project_id,
            projectId: sb.project_id,
            shotNumber: sb.shot_number,
            storyboardId: sb.id,  // 🔥 传递版本 ID
            externalUrl: sb.image_url_external,
            createdAt: new Date().toISOString(),
          },
          {
            priority: 'low',
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false
          }
        )
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failedCount = results.filter(r => r.status === 'rejected').length

    console.log('[Cron] Pending storyboards requeued:', {
      total: pendingStoryboards.length,
      success: successCount,
      failed: failedCount
    })

    return NextResponse.json({
      success: true,
      message: 'Pending storyboards requeued successfully',
      requeued: successCount,
      failed: failedCount,
      details: pendingStoryboards.map(sb => ({
        projectId: sb.project_id,
        shotNumber: sb.shot_number,
        storyboardId: sb.id
      }))
    })

  } catch (error) {
    console.error('[Cron] Failed to requeue pending storyboards:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to requeue pending storyboards',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}

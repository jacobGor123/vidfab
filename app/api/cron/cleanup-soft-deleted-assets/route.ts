/**
 * Cron: 清理软删超过 7 天的资产
 *
 * 流程：
 *   1. 查 user_videos / user_images 中 status='deleted' 且 deleted_at < 7 天前
 *   2. 删 Supabase Storage 中的视频/缩略图/图片文件
 *   3. 物理删数据库行
 *
 * 触发：Vercel cron 凌晨 03:17（避开高峰；非整点 5 分钟 → 减少与其它整点 cron 撞车）
 *   配置入口：vercel.json
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { STORAGE_CONFIG } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RETENTION_DAYS = 7

interface CleanupReport {
  videos: { scanned: number; storageDeleted: number; rowsDeleted: number; storageErrors: string[] }
  images: { scanned: number; storageDeleted: number; rowsDeleted: number; storageErrors: string[] }
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 Cron Secret 校验
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    console.log(`[Cron] cleanup-soft-deleted-assets: cutoff = ${cutoff}`)

    const report: CleanupReport = {
      videos: { scanned: 0, storageDeleted: 0, rowsDeleted: 0, storageErrors: [] },
      images: { scanned: 0, storageDeleted: 0, rowsDeleted: 0, storageErrors: [] },
    }

    await cleanupVideos(cutoff, report)
    await cleanupImages(cutoff, report)

    console.log('[Cron] cleanup-soft-deleted-assets done:', JSON.stringify(report))

    return NextResponse.json({ success: true, cutoff, report })
  } catch (error: any) {
    console.error('[Cron] cleanup-soft-deleted-assets failed:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

async function cleanupVideos(cutoff: string, report: CleanupReport) {
  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.USER_VIDEOS)
    .select('id, user_id, storage_path, thumbnail_path')
    .eq('status', 'deleted')
    .lt('deleted_at', cutoff)
    .limit(500) // 单次最多清 500 条，下次 cron 接着干

  if (error) {
    console.error('[Cron] Failed to query expired videos:', error)
    return
  }

  const list = rows || []
  report.videos.scanned = list.length
  if (list.length === 0) return

  // 删 Storage 文件
  const videoPaths = list
    .map(r => r.storage_path)
    .filter((p): p is string => !!p && !p.startsWith('shotstack:') && !p.startsWith('http'))
  const thumbPaths = list
    .map(r => {
      const t = r.thumbnail_path
      if (!t) return null
      if (t.startsWith('http')) return null
      return t
    })
    .filter((p): p is string => !!p)

  if (videoPaths.length > 0) {
    const { error: err } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.videos)
      .remove(videoPaths)
    if (err) report.videos.storageErrors.push(`videos: ${err.message}`)
    else report.videos.storageDeleted += videoPaths.length
  }

  if (thumbPaths.length > 0) {
    const { error: err } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.thumbnails)
      .remove(thumbPaths)
    if (err) report.videos.storageErrors.push(`thumbnails: ${err.message}`)
  }

  // 物理删数据库行
  const { error: delErr } = await supabaseAdmin
    .from(TABLES.USER_VIDEOS)
    .delete()
    .in('id', list.map(r => r.id))

  if (delErr) {
    console.error('[Cron] Failed to delete video rows:', delErr)
  } else {
    report.videos.rowsDeleted = list.length
  }
}

async function cleanupImages(cutoff: string, report: CleanupReport) {
  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.USER_IMAGES)
    .select('id, user_id, storage_path, storage_url')
    .eq('status', 'deleted')
    .lt('deleted_at', cutoff)
    .limit(500)

  if (error) {
    console.error('[Cron] Failed to query expired images:', error)
    return
  }

  const list = rows || []
  report.images.scanned = list.length
  if (list.length === 0) return

  // 优先用 storage_path；如果只有 storage_url，尝试推导 path（包含 /storage/v1/object/public/{bucket}/{path}）
  const imagePaths = list
    .map(r => {
      if (r.storage_path && !r.storage_path.startsWith('http')) return r.storage_path
      if (r.storage_url) return extractStoragePath(r.storage_url, STORAGE_CONFIG.buckets.images)
      return null
    })
    .filter((p): p is string => !!p)

  if (imagePaths.length > 0) {
    const { error: err } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.buckets.images)
      .remove(imagePaths)
    if (err) report.images.storageErrors.push(`images: ${err.message}`)
    else report.images.storageDeleted += imagePaths.length
  }

  // 物理删数据库行
  const { error: delErr } = await supabaseAdmin
    .from(TABLES.USER_IMAGES)
    .delete()
    .in('id', list.map(r => r.id))

  if (delErr) {
    console.error('[Cron] Failed to delete image rows:', delErr)
  } else {
    report.images.rowsDeleted = list.length
  }
}

/** 从 supabase public URL 提取相对 path */
function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return null
  return url.slice(idx + marker.length)
}

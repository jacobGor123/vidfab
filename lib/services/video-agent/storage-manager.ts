/**
 * Video Agent Storage Manager
 * 处理分镜图和视频片段的下载、上传到 Supabase Storage
 */

import { supabaseAdmin } from '@/lib/supabase'
import { STORAGE_CONFIG } from '@/lib/storage'
// Use the global fetch provided by Node/Next runtime to avoid undici/node-fetch mismatch issues
// that can surface as "fetch failed" in certain environments.

function toErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error'
  if (err instanceof Error) return err.message
  return typeof err === 'string' ? err : JSON.stringify(err)
}

function toErrorStack(err: unknown): string | undefined {
  if (err instanceof Error) return err.stack
  return undefined
}

function toErrorCause(err: unknown): unknown {
  if (err instanceof Error) return (err as any).cause
  return undefined
}

export class VideoAgentStorageManager {
  /**
   * 下载分镜图并上传到 Supabase Storage
   */
  static async downloadAndStoreStoryboard(
    userId: string,
    projectId: string,
    shotNumber: number,
    externalUrl: string
  ) {
    try {
      console.log(`[Storage Manager] 📥 Downloading storyboard shot ${shotNumber}...`)

      // 1. 下载图片
      const response = await fetch(externalUrl, {
        // Some signed/CDN endpoints can behave differently based on agent; set an explicit UA.
        headers: { 'user-agent': 'vidfab-video-agent/1.0' },
      })
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const fileSize = buffer.length

      console.log(`[Storage Manager] Downloaded ${fileSize} bytes`)

      // 2. 生成存储路径
      const storagePath = STORAGE_CONFIG.paths.getVideoAgentStoryboardPath(
        userId,
        projectId,
        shotNumber
      )

      // Helpful for diagnosing policy/bucket/misconfig quickly.
      console.log(
        `[Storage Manager] Upload target bucket=${STORAGE_CONFIG.buckets.images} path=${storagePath}`
      )

      // 3. Upload to Supabase Storage.
      // Use `upload(..., upsert: true)` as the single, most compatible overwrite path.
      // `update()` is not consistently supported across supabase-js versions.
      let uploadErrorMessage: string | null = null
      try {
        const { error: uploadError } = await supabaseAdmin.storage
          .from(STORAGE_CONFIG.buckets.images)
          .upload(storagePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
            cacheControl: '0',
          })
        if (uploadError) {
          uploadErrorMessage = uploadError.message
        }
      } catch (e) {
        // supabase-js may throw (network/undici) instead of returning { error }
        uploadErrorMessage = toErrorMessage(e)
      }

      if (uploadErrorMessage) {
        // Common causes: network/DNS/TLS, wrong supabaseUrl, bucket permissions/policies.
        throw new Error(`Upload failed: ${uploadErrorMessage}`)
      }

      console.log(`[Storage Manager] ✅ Uploaded to: ${storagePath}`)

      // 4. 获取公开 URL（CDN）
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_CONFIG.buckets.images)
        .getPublicUrl(storagePath)

      const cdnUrl = urlData.publicUrl

      // 5. 更新数据库记录
      const { error: updateError } = await supabaseAdmin
        .from('project_storyboards')
        .update({
          image_url_external: externalUrl, // 保存原始外部 URL
          // Ensure project fetch (which normalizes image_url from cdn_url/external/image_url)
          // never serves a stale storage URL after regeneration.
          image_url: cdnUrl,
          storage_path: storagePath,
          cdn_url: cdnUrl,
          storage_status: 'completed',
          file_size: fileSize,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      if (updateError) {
        console.error(`[Storage Manager] Failed to update database:`, updateError)
        throw updateError
      }

      console.log(`[Storage Manager] ✅ Storyboard shot ${shotNumber} stored successfully`)

      return {
        success: true,
        storagePath,
        cdnUrl,
        fileSize,
      }
    } catch (error) {
      console.error(
        `[Storage Manager] ❌ Failed to store storyboard shot ${shotNumber}: ${toErrorMessage(error)}`
      )
      const stack = toErrorStack(error)
      if (stack) console.error(stack)
      const cause = toErrorCause(error)
      if (cause) console.error('[Storage Manager] Underlying cause:', cause)

      // 更新失败状态
      await supabaseAdmin
        .from('project_storyboards')
        .update({
          storage_status: 'failed',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      throw error
    }
  }

  /**
   * 下载视频片段并上传到 Supabase Storage
   */
  static async downloadAndStoreVideoClip(
    userId: string,
    projectId: string,
    shotNumber: number,
    externalUrl: string
  ) {
    try {
      console.log(`[Storage Manager] 📥 Downloading video clip shot ${shotNumber}...`)

      // 1. 下载视频
      const response = await fetch(externalUrl)
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }

      const buffer = await response.buffer()
      const fileSize = buffer.length

      console.log(`[Storage Manager] Downloaded ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

      // 2. 生成存储路径
      const storagePath = STORAGE_CONFIG.paths.getVideoAgentClipPath(
        userId,
        projectId,
        shotNumber
      )

      // 3. 上传到 Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_CONFIG.buckets.videos)
        .upload(storagePath, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log(`[Storage Manager] ✅ Uploaded to: ${storagePath}`)

      // 4. 获取公开 URL（CDN）
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_CONFIG.buckets.videos)
        .getPublicUrl(storagePath)

      const cdnUrl = urlData.publicUrl

      // 5. 更新数据库记录
      const { error: updateError } = await supabaseAdmin
        .from('project_video_clips')
        .update({
          video_url_external: externalUrl, // 保存原始外部 URL
          storage_path: storagePath,
          cdn_url: cdnUrl,
          storage_status: 'completed',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      if (updateError) {
        console.error(`[Storage Manager] Failed to update database:`, updateError)
        throw updateError
      }

      console.log(`[Storage Manager] ✅ Video clip shot ${shotNumber} stored successfully`)

      return {
        success: true,
        storagePath,
        cdnUrl,
        fileSize,
      }
    } catch (error) {
      console.error(`[Storage Manager] ❌ Failed to store video clip shot ${shotNumber}:`, error)

      // 更新失败状态
      await supabaseAdmin
        .from('project_video_clips')
        .update({
          storage_status: 'failed',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      throw error
    }
  }

  /**
   * 批量下载分镜图（带进度追踪）
   */
  static async batchDownloadStoryboards(
    userId: string,
    projectId: string,
    storyboards: Array<{ shotNumber: number; externalUrl: string }>
  ) {
    const results = []

    for (const sb of storyboards) {
      try {
        const result = await this.downloadAndStoreStoryboard(
          userId,
          projectId,
          sb.shotNumber,
          sb.externalUrl
        )
        results.push({ shotNumber: sb.shotNumber, success: true, ...result })
      } catch (error) {
        results.push({
          shotNumber: sb.shotNumber,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    return results
  }

  /**
   * 批量下载视频片段（带进度追踪）
   */
  static async batchDownloadVideoClips(
    userId: string,
    projectId: string,
    clips: Array<{ shotNumber: number; externalUrl: string }>
  ) {
    const results = []

    for (const clip of clips) {
      try {
        const result = await this.downloadAndStoreVideoClip(
          userId,
          projectId,
          clip.shotNumber,
          clip.externalUrl
        )
        results.push({ shotNumber: clip.shotNumber, success: true, ...result })
      } catch (error) {
        results.push({
          shotNumber: clip.shotNumber,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    return results
  }
}

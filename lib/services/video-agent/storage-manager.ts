/**
 * Video Agent Storage Manager
 * 处理分镜图和视频片段的下载、上传到 Supabase Storage
 */

import { supabaseAdmin } from '@/lib/supabase'
import { STORAGE_CONFIG } from '@/lib/storage'
import { assertSafeExternalUrl } from '@/lib/services/video-agent/security/url-guard'
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
    externalUrl: string,
    storyboardId?: string
  ) {
    try {
      console.log(`[Storage Manager] 📥 Downloading storyboard shot ${shotNumber}...`)

      // SSRF guard: external URLs are not trusted.
      assertSafeExternalUrl(externalUrl, { purpose: 'storyboard_download' })

      // 1. 下载图片
      // 🔥 关键修复：BytePlus签名URL只包含host header（X-Tos-SignedHeaders=host）
      // 添加额外headers会导致签名验证失败（403 Forbidden）
      const response = await fetch(externalUrl)
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const fileSize = buffer.length

      console.log(`[Storage Manager] Downloaded ${fileSize} bytes`)

      // 2. 生成存储路径（包含版本ID确保唯一性）
      const storagePath = STORAGE_CONFIG.paths.getVideoAgentStoryboardPath(
        userId,
        projectId,
        shotNumber,
        storyboardId
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

      // 5. 更新数据库记录（精确匹配版本ID或当前版本）
      const updateQuery = supabaseAdmin
        .from('project_storyboards')
        .update({
          image_url_external: externalUrl, // 保存原始外部 URL
          // Ensure project fetch (which normalizes image_url from cdn_url/external/image_url)
          // never serves a stale storage URL after regeneration.
          image_url: cdnUrl,
          image_storage_path: storagePath,
          cdn_url: cdnUrl,
          storage_status: 'completed',
          file_size: fileSize,
          updated_at: new Date().toISOString(),
        } as any)

      // 如果提供了 storyboardId，精确匹配该版本；否则匹配当前版本
      const { error: updateError } = storyboardId
        ? await updateQuery.eq('id', storyboardId)
        : await updateQuery
            .eq('project_id', projectId)
            .eq('shot_number', shotNumber)
            .eq('is_current', true)

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

      // 更新失败状态（精确匹配版本ID或当前版本）
      const failQuery = supabaseAdmin
        .from('project_storyboards')
        .update({
          storage_status: 'failed',
          error_message: toErrorMessage(error),
          updated_at: new Date().toISOString(),
        } as any)

      if (storyboardId) {
        await failQuery.eq('id', storyboardId)
      } else {
        await failQuery
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)
          .eq('is_current', true)
      }

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
    const MAX_RETRIES = 3
    const TIMEOUT_MS = 120000 // 2 分钟超时

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Storage Manager] 📥 Downloading video clip shot ${shotNumber} (attempt ${attempt}/${MAX_RETRIES})...`)

        // SSRF guard: external URLs are not trusted.
        assertSafeExternalUrl(externalUrl, { purpose: 'video_clip_download' })

        // 1. 下载视频（带超时控制）
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        try {
          const response = await fetch(externalUrl, {
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
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

          // 成功！返回结果
          return {
            success: true,
            storagePath,
            cdnUrl,
            fileSize,
          }

        } catch (fetchError) {
          clearTimeout(timeoutId)
          throw fetchError
        }

      } catch (error) {
        const isTimeout = (error as Error).name === 'AbortError'
        const errorMessage = isTimeout
          ? 'Download timeout (2 minutes)'
          : (error as Error).message

        console.error(`[Storage Manager] ❌ Attempt ${attempt}/${MAX_RETRIES} failed for shot ${shotNumber}:`, errorMessage)

        // 如果不是最后一次尝试，等待后重试
        if (attempt < MAX_RETRIES) {
          const delayMs = attempt * 2000 // 递增延迟：2s, 4s
          console.log(`[Storage Manager] ⏳ Retrying in ${delayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }

        // 最后一次尝试也失败了，更新数据库状态
        console.error(`[Storage Manager] ❌ All retries exhausted for shot ${shotNumber}`)

        await supabaseAdmin
          .from('project_video_clips')
          .update({
            storage_status: 'failed',
            updated_at: new Date().toISOString(),
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)

        throw new Error(`Failed to download video clip after ${MAX_RETRIES} attempts: ${errorMessage}`)
      }
    }

    // 不应该到达这里
    throw new Error('Unexpected: retry loop completed without return or throw')
  }

  /**
   * 下载最终合成视频并上传到 Supabase Storage（永久保存）
   */
  static async downloadAndStoreFinalVideo(
    userId: string,
    projectId: string,
    externalUrl: string
  ): Promise<{ storagePath: string; cdnUrl: string; fileSize: number }> {
    const MAX_RETRIES = 3
    const TIMEOUT_MS = 300000 // 5 分钟超时（最终视频可能较大）

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      try {
        console.log(`[Storage Manager] 📥 Downloading final video (attempt ${attempt}/${MAX_RETRIES})...`)

        assertSafeExternalUrl(externalUrl, { purpose: 'final_video_download' })

        const response = await fetch(externalUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const fileSize = buffer.length

        console.log(`[Storage Manager] Downloaded ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

        const storagePath = STORAGE_CONFIG.paths.getVideoAgentFinalVideoPath(userId, projectId)

        const { error: uploadError } = await supabaseAdmin.storage
          .from(STORAGE_CONFIG.buckets.videos)
          .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabaseAdmin.storage
          .from(STORAGE_CONFIG.buckets.videos)
          .getPublicUrl(storagePath)

        console.log(`[Storage Manager] ✅ Final video uploaded to: ${storagePath}`)
        return { storagePath, cdnUrl: urlData.publicUrl, fileSize }

      } catch (error) {
        clearTimeout(timeoutId)
        const isTimeout = (error as Error).name === 'AbortError'
        const msg = isTimeout ? 'Download timeout (5 minutes)' : (error as Error).message
        console.error(`[Storage Manager] ❌ Attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, attempt * 3000))
          continue
        }
        throw new Error(`Failed to store final video after ${MAX_RETRIES} attempts: ${msg}`)
      }
    }

    throw new Error('Unexpected: retry loop completed without return or throw')
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

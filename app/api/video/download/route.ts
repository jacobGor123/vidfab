import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { UserVideosDB } from '@/lib/database/user-videos'
import { supabaseAdmin } from '@/lib/supabase'
import { STORAGE_CONFIG } from '@/lib/storage'
import {
  assertSafeExternalUrl,
  type ExternalUrlPurpose
} from '@/lib/services/video-agent/security/url-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DOWNLOAD_TIMEOUT_MS = 60_000
const MAX_REDIRECTS = 3
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface DownloadSource {
  url: string
  fallbackUrl?: string
  filename: string
  purpose: ExternalUrlPurpose
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_PATTERN.test(value)
}

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)

  return normalized || `vidfab-video-${Date.now()}.mp4`
}

function contentDisposition(filename: string): string {
  const fallback =
    filename.replace(/[^\x20-\x7e]/g, '').replace(/"/g, "'") ||
    'vidfab-video.mp4'
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

async function createSupabaseSourceUrl(storagePath: string): Promise<string> {
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(STORAGE_CONFIG.buckets.videos)
    .createSignedUrl(storagePath, 60)

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl
  }

  const { data } = supabaseAdmin.storage
    .from(STORAGE_CONFIG.buckets.videos)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

async function fetchWithRedirectGuard(
  initialUrl: string,
  purpose: ExternalUrlPurpose
): Promise<Response> {
  let currentUrl = assertSafeExternalUrl(initialUrl, { purpose })

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

    try {
      const response = await fetch(currentUrl.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'video/*,application/octet-stream,*/*'
        }
      })

      clearTimeout(timeout)

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location')
        if (!location) {
          throw new Error('Download redirect missing location')
        }

        const nextUrl = new URL(location, currentUrl).toString()
        currentUrl = assertSafeExternalUrl(nextUrl, { purpose })
        continue
      }

      return response
    } catch (error) {
      clearTimeout(timeout)
      throw error
    }
  }

  throw new Error('Download redirected too many times')
}

async function fetchDownloadSource(source: DownloadSource): Promise<Response> {
  const fallbackUrl =
    source.fallbackUrl && source.fallbackUrl !== source.url
      ? source.fallbackUrl
      : undefined

  try {
    const response = await fetchWithRedirectGuard(source.url, source.purpose)
    if (response.ok || !fallbackUrl) {
      return response
    }
  } catch (error) {
    if (!fallbackUrl) {
      throw error
    }
  }

  return fetchWithRedirectGuard(fallbackUrl, source.purpose)
}

async function resolveVideoSource(
  searchParams: URLSearchParams,
  userId: string
): Promise<DownloadSource | null> {
  const videoId = searchParams.get('videoId')
  const fallbackUrl = searchParams.get('url')

  if (isUuid(videoId)) {
    const video = await UserVideosDB.getVideoById(videoId!, userId)
    if (!video || video.status === 'deleted') {
      return null
    }

    const filename = sanitizeFilename(`vidfab-video-${video.id}.mp4`)
    const storagePath = video.storage_path?.trim()

    if (storagePath && !storagePath.startsWith('shotstack:')) {
      const sourceUrl = isHttpUrl(storagePath)
        ? storagePath
        : await createSupabaseSourceUrl(storagePath)

      return {
        url: sourceUrl,
        fallbackUrl: video.original_url || undefined,
        filename,
        purpose: 'video_clip_download'
      }
    }

    if (video.original_url) {
      return {
        url: video.original_url,
        filename,
        purpose: 'video_clip_download'
      }
    }
  }

  if (fallbackUrl) {
    return {
      url: fallbackUrl,
      filename: sanitizeFilename(
        searchParams.get('filename') || `vidfab-video-${Date.now()}.mp4`
      ),
      purpose: 'video_clip_download'
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return jsonError('Authentication required', 401)
    }

    const { searchParams } = new URL(request.url)
    const source = await resolveVideoSource(searchParams, session.user.uuid)
    if (!source) {
      return jsonError('Video source not found', 404)
    }

    const upstream = await fetchDownloadSource(source)
    if (!upstream.ok) {
      const status = upstream.status === 404 ? 404 : 502
      return jsonError(`Video source returned HTTP ${upstream.status}`, status)
    }

    if (!upstream.body) {
      return jsonError('Video source returned an empty response', 502)
    }

    const contentLength = upstream.headers.get('content-length')
    if (
      contentLength &&
      Number(contentLength) > STORAGE_CONFIG.limits.maxVideoSize
    ) {
      return jsonError('Video file is too large to download', 413)
    }

    const headers = new Headers()
    headers.set(
      'Content-Type',
      upstream.headers.get('content-type') || 'video/mp4'
    )
    headers.set('Content-Disposition', contentDisposition(source.filename))
    headers.set('Cache-Control', 'no-store')

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Video download API error:', error)

    const message = error instanceof Error ? error.message : 'Download failed'
    if (message.startsWith('Invalid URL:')) {
      return jsonError(message, 400)
    }

    if (message.includes('aborted')) {
      return jsonError('Video download timed out', 504)
    }

    return jsonError('Video download failed', 502)
  }
}

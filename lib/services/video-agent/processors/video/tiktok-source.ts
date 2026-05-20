import { execFile } from 'child_process'
import { createWriteStream } from 'fs'
import { mkdtemp, readdir, rm, stat } from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { promisify } from 'util'
import { assertSafeExternalUrl } from '@/lib/services/video-agent/security/url-guard'
import { isValidTikTokUrl } from './youtube-utils'

const execFileAsync = promisify(execFile)
const MAX_TIKTOK_VIDEO_BYTES = parseInt(process.env.TIKTOK_MAX_VIDEO_BYTES || `${120 * 1024 * 1024}`, 10)
const YT_DLP_MAX_FILESIZE = `${Math.ceil(MAX_TIKTOK_VIDEO_BYTES / 1024 / 1024)}M`
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export interface TikTokSourceMetadata {
  platform: 'tiktok'
  original_url: string
  canonical_url?: string
  post_id?: string
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
}

export interface PreparedTikTokVideo {
  filePath: string
  mimeType: string
  duration?: number
  metadata: TikTokSourceMetadata
  cleanup: () => Promise<void>
}

interface TikTokOEmbedResponse {
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
  html?: string
}

interface ResolverPayload {
  videoUrl?: string
  downloadUrl?: string
  url?: string
  playUrl?: string
  noWatermarkUrl?: string
  duration?: number | string
  durationSeconds?: number | string
  canonicalUrl?: string
  postId?: string
  title?: string
  authorName?: string
  authorUrl?: string
  thumbnailUrl?: string
  mimeType?: string
}

function normalizeTikTokUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.webm') return 'video/webm'
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.m4v' || ext === '.mp4') return 'video/mp4'
  return 'video/mp4'
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return '.webm'
  if (mimeType.includes('quicktime')) return '.mov'
  return '.mp4'
}

function extractPostId(value?: string): string | undefined {
  if (!value) return undefined
  return value.match(/\/video\/(\d+)/)?.[1] || value.match(/data-video-id="(\d+)"/)?.[1]
}

async function resolveRedirectUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(10000)
    })
    await response.body?.cancel()
    return response.url || url
  } catch (error) {
    console.warn('[TikTok Source] Failed to resolve redirect URL:', error)
    return url
  }
}

async function fetchOEmbed(url: string): Promise<TikTokOEmbedResponse | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return null
    }

    return await response.json() as TikTokOEmbedResponse
  } catch (error) {
    console.warn('[TikTok Source] Failed to fetch oEmbed metadata:', error)
    return null
  }
}

async function fetchSafeVideoUrl(videoUrl: string, init: RequestInit, maxRedirects = 5): Promise<Response> {
  let currentUrl = videoUrl

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    assertSafeExternalUrl(currentUrl, { purpose: 'video_clip_download' })

    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual'
    })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response
    }

    const location = response.headers.get('location')
    await response.body?.cancel()

    if (!location) {
      throw new Error('TikTok video download redirected without a Location header')
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error('TikTok video download had too many redirects')
}

async function downloadRemoteVideo(videoUrl: string, tempDir: string, mimeType = 'video/mp4') {
  const response = await fetchSafeVideoUrl(videoUrl, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT },
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download TikTok video: ${response.status} ${response.statusText}`)
  }

  const contentLength = toNumber(response.headers.get('content-length'))
  if (contentLength && contentLength > MAX_TIKTOK_VIDEO_BYTES) {
    throw new Error('TikTok video file is too large to analyze')
  }

  const responseMime = response.headers.get('content-type') || mimeType
  const finalMimeType = responseMime.includes('video/') ? responseMime.split(';')[0] : mimeType
  const filePath = path.join(tempDir, `source${getExtensionFromMimeType(finalMimeType)}`)
  let downloadedBytes = 0

  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      downloadedBytes += chunk.length
      if (downloadedBytes > MAX_TIKTOK_VIDEO_BYTES) {
        callback(new Error('TikTok video file is too large to analyze'))
        return
      }
      callback(null, chunk)
    }
  })

  await pipeline(
    Readable.fromWeb(response.body as any),
    limiter,
    createWriteStream(filePath)
  )

  return {
    filePath,
    mimeType: finalMimeType,
    sizeBytes: downloadedBytes
  }
}

async function resolveWithExternalService(
  url: string,
  tempDir: string
): Promise<PreparedTikTokVideo | null> {
  const endpoint = process.env.TIKTOK_VIDEO_RESOLVER_URL
  if (!endpoint) return null

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }

  if (process.env.TIKTOK_RESOLVER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.TIKTOK_RESOLVER_API_KEY}`
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    throw new Error(`TikTok resolver failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json() as ResolverPayload
  const mediaUrl =
    payload.videoUrl ||
    payload.downloadUrl ||
    payload.noWatermarkUrl ||
    payload.playUrl ||
    payload.url

  if (!mediaUrl) {
    throw new Error('TikTok resolver did not return a video URL')
  }

  const downloaded = await downloadRemoteVideo(mediaUrl, tempDir, payload.mimeType || 'video/mp4')
  const metadata: TikTokSourceMetadata = {
    platform: 'tiktok',
    original_url: url,
    canonical_url: payload.canonicalUrl,
    post_id: payload.postId || extractPostId(payload.canonicalUrl),
    title: payload.title,
    author_name: payload.authorName,
    author_url: payload.authorUrl,
    thumbnail_url: payload.thumbnailUrl
  }

  return {
    filePath: downloaded.filePath,
    mimeType: downloaded.mimeType,
    duration: toNumber(payload.durationSeconds) ?? toNumber(payload.duration),
    metadata,
    cleanup: () => rm(tempDir, { recursive: true, force: true })
  }
}

async function resolveWithYtDlp(url: string, tempDir: string): Promise<PreparedTikTokVideo> {
  const binary = process.env.YT_DLP_PATH || 'yt-dlp'
  let info: any = {}

  try {
    const { stdout } = await execFileAsync(binary, [
      '--dump-single-json',
      '--no-playlist',
      '--no-warnings',
      url
    ], {
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024
    })

    info = JSON.parse(stdout)
  } catch (error) {
    console.warn('[TikTok Source] yt-dlp metadata probe failed, continuing to download:', error)
  }

  const outputTemplate = path.join(tempDir, 'source.%(ext)s')
  try {
    await execFileAsync(binary, [
      '--no-playlist',
      '--no-warnings',
      '--format',
      'best[ext=mp4]/mp4/best',
      '--max-filesize',
      YT_DLP_MAX_FILESIZE,
      '-o',
      outputTemplate,
      url
    ], {
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024
    })
  } catch (error: any) {
    throw new Error(
      `Failed to download TikTok video with yt-dlp. Configure TIKTOK_VIDEO_RESOLVER_URL or install yt-dlp on the worker. ${error?.message || ''}`.trim()
    )
  }

  const files = await readdir(tempDir)
  const videoFile = files.find((file) => file.startsWith('source.'))
  if (!videoFile) {
    throw new Error('yt-dlp completed but no downloaded video file was found')
  }

  const filePath = path.join(tempDir, videoFile)
  const fileStat = await stat(filePath)
  if (fileStat.size > MAX_TIKTOK_VIDEO_BYTES) {
    throw new Error('TikTok video file is too large to analyze')
  }

  const canonicalUrl = info.webpage_url || info.original_url || url
  const metadata: TikTokSourceMetadata = {
    platform: 'tiktok',
    original_url: url,
    canonical_url: canonicalUrl,
    post_id: info.id || extractPostId(canonicalUrl),
    title: info.title,
    author_name: info.uploader || info.channel,
    author_url: info.uploader_url || info.channel_url,
    thumbnail_url: info.thumbnail
  }

  return {
    filePath,
    mimeType: info.ext ? getMimeTypeFromPath(filePath) : 'video/mp4',
    duration: toNumber(info.duration),
    metadata,
    cleanup: () => rm(tempDir, { recursive: true, force: true })
  }
}

export async function prepareTikTokVideo(url: string): Promise<PreparedTikTokVideo> {
  if (!isValidTikTokUrl(url)) {
    throw new Error('Invalid TikTok URL format')
  }

  const normalizedUrl = normalizeTikTokUrl(url)
  const resolvedUrl = await resolveRedirectUrl(normalizedUrl)
  const oEmbed = await fetchOEmbed(resolvedUrl)
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'vidfab-tiktok-'))

  try {
    const resolved = await resolveWithExternalService(resolvedUrl, tempDir)
      || await resolveWithYtDlp(resolvedUrl, tempDir)

    resolved.metadata = {
      ...resolved.metadata,
      canonical_url: resolved.metadata.canonical_url || resolvedUrl,
      post_id: resolved.metadata.post_id || extractPostId(resolvedUrl) || extractPostId(oEmbed?.html),
      title: resolved.metadata.title || oEmbed?.title,
      author_name: resolved.metadata.author_name || oEmbed?.author_name,
      author_url: resolved.metadata.author_url || oEmbed?.author_url,
      thumbnail_url: resolved.metadata.thumbnail_url || oEmbed?.thumbnail_url
    }

    return resolved
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

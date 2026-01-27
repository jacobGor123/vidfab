/**
 * Video Agent - Proxy external images for browser preview
 *
 * Some providers (e.g. signed TOS URLs) are not reliably renderable directly in browsers
 * (signature/header constraints, auth query param differences, etc.). This endpoint fetches
 * the external image server-side and streams it back to the browser.
 *
 * Security: guarded by SSRF protections (url-guard) and a tight redirect policy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import {
  assertSafeExternalUrl,
  isBlockedRedirectLocation,
} from '@/lib/services/video-agent/security/url-guard'

const MAX_BYTES = 12 * 1024 * 1024 // 12MB hard cap for preview images
const FETCH_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 3

function getSearchUrl(req: NextRequest): string | null {
  // Accept both `url` and `u` to keep client code short.
  return req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('u')
}

async function fetchWithRedirects(url: string): Promise<Response> {
  let current = url

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    // Re-check the target on every hop.
    assertSafeExternalUrl(current, { purpose: 'storyboard_download' })

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      // 🔥 关键修复：BytePlus签名URL只包含host header（X-Tos-SignedHeaders=host）
      // 如果添加额外headers（如user-agent），会导致签名验证失败（403 Forbidden）
      // 必须使用默认fetch配置，不添加任何自定义headers
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(t)
    }

    // Handle manual redirects.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Upstream redirect missing location')
      if (isBlockedRedirectLocation(location)) {
        throw new Error('Blocked redirect location')
      }
      // Resolve relative redirects safely.
      current = new URL(location, current).toString()
      continue
    }

    return res
  }

  throw new Error('Too many redirects')
}

export const GET = withAuth(async (req: NextRequest) => {
  const raw = getSearchUrl(req)
  if (!raw) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  try {
    // Initial parse/validation.
    assertSafeExternalUrl(raw, { purpose: 'storyboard_download' })

    console.log('[ProxyImage] Fetching URL length:', raw.length)
    console.log('[ProxyImage] Full URL:', raw)
    const upstream = await fetchWithRedirects(raw)

    if (!upstream.ok) {
      console.error('[ProxyImage] Upstream failed:', {
        url: raw.substring(0, 150),
        status: upstream.status,
        statusText: upstream.statusText
      })
      return NextResponse.json(
        { error: 'Upstream fetch failed', status: upstream.status },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Upstream content-type is not an image', contentType },
        { status: 415 }
      )
    }

    const lenHeader = upstream.headers.get('content-length')
    const len = lenHeader ? Number(lenHeader) : NaN
    if (Number.isFinite(len) && len > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    // If content-length is missing, we still enforce MAX_BYTES by buffering up to the cap.
    const arrayBuffer = await upstream.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        // Cache a bit to avoid hammering upstream while polling.
        // Cache key includes the full query string (url+t param), so this stays safe.
        'cache-control': 'private, max-age=300',
      },
    })
  } catch (e: any) {
    console.error('[ProxyImage] Error:', {
      url: raw?.substring(0, 150),
      error: e?.message || String(e)
    })
    return NextResponse.json(
      { error: 'Proxy failed', message: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined },
      { status: 400 }
    )
  }
})

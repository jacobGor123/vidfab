/**
 * URL Guard for server-side fetch
 *
 * We allow saving external URLs (user input / provider output), but we must NOT
 * blindly fetch them from the server. This guard prevents common SSRF vectors
 * and limits abuse.
 */

import { isIP } from 'net'

export type ExternalUrlPurpose =
  | 'video_clip_download'
  | 'storyboard_download'
  | 'character_reference_download'
  | 'subtitle_download'
  | 'generic'

export interface UrlGuardOptions {
  purpose?: ExternalUrlPurpose
  allowHttp?: boolean
  maxLength?: number
}

const DEFAULT_MAX_LENGTH = 2048

function isPrivateOrLocalIp(ip: string): boolean {
  // IPv4 only for now; we explicitly block IPv6 loopback via hostname checks
  // and by rejecting IP literals (handled separately).
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true
  }

  const [a, b] = parts

  // 127.0.0.0/8 loopback
  if (a === 127) return true
  // 10.0.0.0/8 private
  if (a === 10) return true
  // 172.16.0.0/12 private
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16 private
  if (a === 192 && b === 168) return true
  // 169.254.0.0/16 link-local (cloud metadata)
  if (a === 169 && b === 254) return true
  // 0.0.0.0/8
  if (a === 0) return true

  return false
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/\.+$/, '').toLowerCase()
}

export function assertSafeExternalUrl(rawUrl: string, options: UrlGuardOptions = {}): URL {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Invalid URL: empty')
  }
  if (rawUrl.length > maxLength) {
    throw new Error('Invalid URL: too long')
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL: parse failed')
  }

  const protocol = url.protocol.toLowerCase()
  if (protocol !== 'https:' && !(options.allowHttp && protocol === 'http:')) {
    throw new Error(`Invalid URL: unsupported protocol ${protocol}`)
  }

  const hostname = normalizeHostname(url.hostname)

  // Block obvious local targets.
  if (hostname === 'localhost' || hostname === '0.0.0.0') {
    throw new Error('Invalid URL: local hostname is not allowed')
  }

  // Block IP literals (both IPv4 and IPv6) to avoid DNS rebinding and metadata hits.
  // For IPv6 literals, WHATWG URL keeps brackets in href but hostname is typically without brackets.
  if (isIP(hostname)) {
    throw new Error('Invalid URL: IP literal is not allowed')
  }

  // Extra block for IPv6 loopback written as [::1]
  if (hostname === '::1' || hostname === '[::1]') {
    throw new Error('Invalid URL: IP literal is not allowed')
  }

  // Best-effort block for dotted-quad masquerading as hostname.
  // isIP() already catches it, but keep an extra guard for weird inputs.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    throw new Error('Invalid URL: IP literal is not allowed')
  }

  // Note: Without DNS resolution we can't detect private IPs behind hostnames.
  // We mitigate via banning IP literals + redirect re-check + strict timeouts/size limits.

  // Block common metadata hostnames (defense-in-depth).
  if (hostname === 'metadata' || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
    throw new Error('Invalid URL: internal hostname is not allowed')
  }

  // Disallow credentials in URL.
  if (url.username || url.password) {
    throw new Error('Invalid URL: credentials are not allowed')
  }

  // Basic path sanity.
  if (!url.pathname || url.pathname === '/') {
    // Allow root only for generic use-cases; downloads should be a concrete object URL.
    if (options.purpose && options.purpose !== 'generic') {
      throw new Error('Invalid URL: missing path')
    }
  }

  // Extra hard block for well-known IPv4 private ranges when they appear in URL string
  // as hostnames via user tricks (e.g., 127.0.0.1.nip.io). We can't fully solve this
  // without DNS resolution, but we can reject common suffix-based rebinding services.
  if (hostname.endsWith('.nip.io') || hostname.endsWith('.sslip.io') || hostname.endsWith('.xip.io')) {
    throw new Error('Invalid URL: dynamic IP hostnames are not allowed')
  }

  return url
}

export function isBlockedRedirectLocation(location: string): boolean {
  try {
    assertSafeExternalUrl(location, { purpose: 'generic', allowHttp: false })
    return false
  } catch {
    return true
  }
}

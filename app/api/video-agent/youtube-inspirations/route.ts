/**
 * YouTube Inspirations API
 *
 * 从 Orange Plot Twist 频道的 RSS feed 抓取最近视频，作为 Video Agent 主页的灵感素材。
 * 24 小时缓存，零 API key 依赖。
 */

import { NextResponse } from 'next/server'

const CHANNEL_ID = process.env.YOUTUBE_INSPIRATION_CHANNEL_ID || 'UC9ouyqToGqEZzWvlOo1lXkQ'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
const MAX_ITEMS = 12

// Next.js ISR：每 24h 重新拉取
export const revalidate = 86400
export const runtime = 'nodejs'

export interface YouTubeInspirationItem {
  videoId: string
  title: string
  thumbnailUrl: string
  shortsUrl: string
  publishedAt: string
}

interface ApiResponse {
  items: YouTubeInspirationItem[]
  fetchedAt: string
}

export async function GET() {
  try {
    const xml = await fetchRss()
    const items = parseEntries(xml).slice(0, MAX_ITEMS)

    const body: ApiResponse = {
      items,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(body, {
      headers: {
        // 浏览器/CDN 也缓存 24h，stale-while-revalidate 1h
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch (error: any) {
    console.error('[youtube-inspirations] fetch failed', error)
    // 不抛 5xx，返回空列表让前端降级显示
    return NextResponse.json<ApiResponse>(
      { items: [], fetchedAt: new Date().toISOString() },
      { status: 200 }
    )
  }
}

async function fetchRss(): Promise<string> {
  const res = await fetch(RSS_URL, {
    headers: {
      // YouTube 偶尔对无 UA 请求返回 403
      'User-Agent': 'Mozilla/5.0 (compatible; VidFabBot/1.0)',
    },
    // 复用 Next 的 Data Cache
    next: { revalidate: 86400 },
  })
  if (!res.ok) {
    throw new Error(`RSS responded ${res.status}`)
  }
  return res.text()
}

/**
 * 用正则解析 entry —— 比引入 fast-xml-parser 轻量。
 * RSS 的 entry 结构稳定，YouTube 至少十年没改过。
 */
function parseEntries(xml: string): YouTubeInspirationItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
  const items: YouTubeInspirationItem[] = []

  for (const entry of entries) {
    const videoId = pick(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/)
    const title = pick(entry, /<title>([\s\S]*?)<\/title>/)
    const link = pick(entry, /<link rel="alternate" href="([^"]+)"/)
    const published = pick(entry, /<published>([^<]+)<\/published>/)
    const thumbnail = pick(entry, /<media:thumbnail url="([^"]+)"/)

    if (!videoId || !title) continue

    items.push({
      videoId,
      title: decodeHtml(title),
      // 即便 RSS 里返回的 link 不是 /shorts/，我们也强制构造一个 shorts URL —— 频道全是 shorts
      shortsUrl: link?.includes('/shorts/')
        ? link
        : `https://www.youtube.com/shorts/${videoId}`,
      thumbnailUrl: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: published || '',
    })
  }

  return items
}

function pick(source: string, re: RegExp): string {
  return source.match(re)?.[1]?.trim() ?? ''
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

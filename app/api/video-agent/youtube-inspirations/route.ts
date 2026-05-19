/**
 * YouTube Inspirations API
 *
 * 主源：Orange Plot Twist 频道 RSS feed (24h ISR 缓存)
 * 备用：hardcoded FALLBACK_VIDEOS（RSS 失败 / 频道下架时确保前端不空）
 *
 * 触发 fallback 的场景（已实测）：
 *   - YouTube 偶尔对个别 channel 关闭 RSS endpoint（返回 404）
 *   - 网络/防火墙问题
 */

import { NextResponse } from 'next/server'

const CHANNEL_ID = process.env.YOUTUBE_INSPIRATION_CHANNEL_ID || 'UC9ouyqToGqEZzWvlOo1lXkQ'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
const MAX_ITEMS = 12

/**
 * 静态后备列表 — Orange Plot Twist 频道的精选 Shorts。
 * 当 RSS 抓取失败时使用。后续如需调整：
 *   1. 浏览器打开 https://www.youtube.com/@orangeplottwist
 *   2. 复制视频 URL 中的 11 位 videoId
 *   3. 添加到这个数组（title 可选；不写时前端用 videoId 顶上）
 */
const FALLBACK_VIDEOS: Array<{ videoId: string; title: string }> = [
  { videoId: 'CG6oLUL1Urk', title: 'He did ALL THIS for what?! 😱🐈💰' },
  { videoId: 'hScRsp9vib0', title: 'Karma is a Rabbit! 🐰🔪' },
  { videoId: 'oEIinFUWkRs', title: "Who's the REAL Boss? 💼🐭" },
  { videoId: 'shjgI1wLFPM', title: 'Two Abandoned Babies, Two Completely Different Lives' },
  { videoId: '17Ces6kGXTA', title: 'He Worked Day and Night to Save His Best Friend' },
]

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
  let items: YouTubeInspirationItem[] = []
  let source: 'rss' | 'fallback' = 'rss'

  try {
    const xml = await fetchRss()
    items = parseEntries(xml).slice(0, MAX_ITEMS)
  } catch (error: any) {
    console.warn('[youtube-inspirations] RSS fetch failed, using fallback:', error?.message)
  }

  // RSS 拿到 0 条也走 fallback（覆盖 endpoint 200-but-empty 情况）
  if (items.length === 0) {
    items = FALLBACK_VIDEOS.map(toFallbackItem)
    source = 'fallback'
  }

  const body: ApiResponse & { source: 'rss' | 'fallback' } = {
    items,
    fetchedAt: new Date().toISOString(),
    source,
  }

  return NextResponse.json(body, {
    headers: {
      // RSS 缓存 24h；fallback 缓存短一些（10 分钟）以便 RSS 恢复后尽快切回
      'Cache-Control': source === 'rss'
        ? 'public, max-age=86400, stale-while-revalidate=3600'
        : 'public, max-age=600, stale-while-revalidate=300',
    },
  })
}

function toFallbackItem(v: { videoId: string; title: string }): YouTubeInspirationItem {
  return {
    videoId: v.videoId,
    title: v.title || v.videoId,
    shortsUrl: `https://www.youtube.com/shorts/${v.videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    publishedAt: '',
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

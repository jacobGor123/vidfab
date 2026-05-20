/**
 * Discover - InspirationsGrid
 *
 * 顶部：内容专区 tab（entertainment / product_demo） + 右侧 media 切换（image / video）
 * 底部：masonry 卡片网格（InspirationCard）
 *
 * 数据：/api/discover?tab=...&media=...
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Film, Image as ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useRemix } from '@/hooks/use-remix'
import { DiscoverContentTab, DiscoverMediaType, type DiscoverVideo } from '@/types/discover'
import { InspirationCard } from './inspiration-card'

const fetcher = (url: string) => fetch(url, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache',
  },
}).then(r => r.json())

const TABS: Array<{ key: DiscoverContentTab; labelKey: string; fallback: string }> = [
  { key: DiscoverContentTab.ENTERTAINMENT, labelKey: 'discover.tabEntertainment', fallback: 'Entertainment' },
  { key: DiscoverContentTab.PRODUCT_DEMO, labelKey: 'discover.tabProductDemo', fallback: 'Product Demo' },
]

export function InspirationsGrid() {
  const t = useTranslations('studio')
  const [activeTab, setActiveTab] = useState<DiscoverContentTab>(DiscoverContentTab.ENTERTAINMENT)
  const [media, setMedia] = useState<DiscoverMediaType | 'all'>('all')
  const { remixVideo } = useRemix()

  const query = new URLSearchParams({ tab: activeTab })
  if (media !== 'all') query.set('media', media)

  const { data, isLoading } = useSWR(`/api/discover?${query.toString()}`, fetcher, {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
  })
  const items: DiscoverVideo[] = data?.success ? data.data : []

  const handleRemix = async (item: DiscoverVideo) => {
    await remixVideo({
      prompt: item.prompt,
      imageUrl: item.image_url || item.video_url,
      title: item.prompt.slice(0, 60),
    })
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* 大标题 */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          {tt(t, 'discover.inspirationsTitle', 'Inspirations')}
        </h2>

        {/* 右侧 image / video 切换 */}
        <MediaToggle value={media} onChange={setMedia} />
      </div>

      {/* 内容专区 tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
              activeTab === tab.key
                ? 'bg-purple-500/20 border-purple-400/50 text-purple-100'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/25'
            )}
          >
            {tt(t, tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading && <SkeletonGrid />}

      {!isLoading && items.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-5xl mb-3">🎬</div>
          <div className="text-slate-400">{tt(t, 'discover.noVideos', 'Nothing here yet.')}</div>
          <div className="text-slate-500 text-sm mt-1">
            {tt(t, 'discover.checkBackLater', 'Check back later for new inspirations.')}
          </div>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4" style={{ columnFill: 'balance' }}>
          {items.map(item => (
            <InspirationCard key={item.id} item={item} onRemix={handleRemix} />
          ))}
        </div>
      )}
    </section>
  )
}

function MediaToggle({
  value,
  onChange,
}: {
  value: DiscoverMediaType | 'all'
  onChange: (v: DiscoverMediaType | 'all') => void
}) {
  const t = useTranslations('studio')
  const opts: Array<{ k: DiscoverMediaType | 'all'; icon: React.ReactNode; labelKey: string; fallback: string }> = [
    { k: 'all', icon: null, labelKey: 'discover.mediaAll', fallback: 'All' },
    { k: DiscoverMediaType.VIDEO, icon: <Film className="w-3.5 h-3.5" />, labelKey: 'discover.mediaVideo', fallback: 'Video' },
    { k: DiscoverMediaType.IMAGE, icon: <ImageIcon className="w-3.5 h-3.5" />, labelKey: 'discover.mediaImage', fallback: 'Image' },
  ]
  return (
    <div className="inline-flex rounded-full p-[3px] border border-white/10 bg-white/[0.03]">
      {opts.map(o => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
            value === o.k ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          {o.icon}
          <span>{tt(t, o.labelKey, o.fallback)}</span>
        </button>
      ))}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4" style={{ columnFill: 'balance' }}>
      {[280, 320, 360, 300, 340, 280, 320, 360].map((h, i) => (
        <div key={i} className="mb-4 rounded-lg bg-gray-900/60 animate-pulse" style={{ height: h }} />
      ))}
    </div>
  )
}

// next-intl missing key 默认返回 `${namespace}.${key}` 字符串；用 fallback 兜底避免空 / 露出 key 名
function tt(t: ReturnType<typeof useTranslations>, key: string, fallback: string) {
  try {
    const v = t(key as any)
    if (typeof v !== 'string') return fallback
    // missing 时返回 'studio.discover.xxx'，正好以传入 key 结尾
    if (v.endsWith(key)) return fallback
    return v
  } catch {
    return fallback
  }
}

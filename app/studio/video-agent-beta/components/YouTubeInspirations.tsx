/**
 * YouTube Inspirations
 *
 * 主页底部 — 从 Orange Plot Twist 频道拉缩略图。
 * 交互：
 *   - 卡片任意位置点击 → 弹框播放 YouTube Shorts
 *   - 右下角 Remix 按钮（stopPropagation）→ 把 URL 回填到 reference 表单
 * 不显示频道账户信息（按需求）。
 */

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Copy, Play, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { YouTubeInspirationItem } from '@/app/api/video-agent/youtube-inspirations/route'

interface YouTubeInspirationsProps {
  onRemix: (youtubeUrl: string) => void
}

const SKELETON_COUNT = 6

export default function YouTubeInspirations({ onRemix }: YouTubeInspirationsProps) {
  const [items, setItems] = useState<YouTubeInspirationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingItem, setPlayingItem] = useState<YouTubeInspirationItem | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/video-agent/youtube-inspirations')
        const data = await res.json()
        if (!cancelled) setItems(data.items || [])
      } catch (error) {
        console.error('Failed to load YouTube inspirations:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 加载中：骨架占位
  if (isLoading) {
    return (
      <Section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="aspect-[9/16] rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      </Section>
    )
  }

  // 加载失败 / 空数据：整块隐藏（避免空区域占位）
  if (items.length === 0) {
    return null
  }

  return (
    <>
      <Section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((item) => (
            <InspirationCard
              key={item.videoId}
              item={item}
              onRemix={onRemix}
              onPlay={() => setPlayingItem(item)}
            />
          ))}
        </div>
      </Section>

      <VideoPlayerDialog
        item={playingItem}
        onClose={() => setPlayingItem(null)}
      />
    </>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  const t = useTranslations('studio.storyToVideo')
  return (
    <div className="border-t border-white/5 pt-10 sm:pt-14">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white/90">{t('inspirationsTitle')}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {t('inspirationsHint')}
        </p>
      </div>
      {children}
    </div>
  )
}

function InspirationCard({
  item,
  onRemix,
  onPlay,
}: {
  item: YouTubeInspirationItem
  onRemix: (url: string) => void
  onPlay: () => void
}) {
  const t = useTranslations('studio')
  const tStory = useTranslations('studio.storyToVideo')
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={item.title}
      className="group relative block w-full overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/40 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 text-left"
    >
      {/* 缩略图：YouTube hqdefault 是 4:3，强制 9:16 容器 + cover 裁剪居中 */}
      <div className="relative aspect-[9/16] bg-black">
        {!imgFailed ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            {t('discover.previewUnavailable')}
          </div>
        )}

        {/* 底部渐变蒙层让标题/按钮更易读 */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* hover 时居中显示播放图标，提示可点击播放 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="rounded-full bg-black/50 p-3 backdrop-blur-sm border border-white/15">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>

        {/* Remix 按钮：右下角胶囊，stopPropagation 不触发卡片播放 */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onRemix(item.shortsUrl)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              e.preventDefault()
              onRemix(item.shortsUrl)
            }
          }}
          className={cn(
            'absolute bottom-2.5 right-2.5 z-10',
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'text-xs font-semibold text-white cursor-pointer',
            'bg-black/70 backdrop-blur-md border border-white/15',
            'hover:bg-purple-600/90 hover:border-purple-400/50',
            'transition-all'
          )}
          aria-label={`${tStory('youtubeRemixAria')} ${item.title}`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{t('discover.remix')}</span>
        </span>

        {/* 标题：左下角，限两行 */}
        <div className="absolute inset-x-0 bottom-0 p-3 pr-20 pointer-events-none">
          <p className="text-xs text-white/85 line-clamp-2 font-medium leading-snug">
            {item.title}
          </p>
        </div>
      </div>
    </button>
  )
}

/**
 * YouTube Shorts 播放弹框
 * - 用 iframe 嵌入；自动播放
 * - 移动端按 9:16 撑满；桌面端固定 ~360×640 居中
 */
function VideoPlayerDialog({
  item,
  onClose,
}: {
  item: YouTubeInspirationItem | null
  onClose: () => void
}) {
  const open = !!item

  // iframe src：autoplay + 关闭推荐
  const src = item
    ? `https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : ''

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 bg-black border-white/10 overflow-hidden"
        style={{ maxWidth: 360, width: '92vw' }}
      >
        <DialogTitle className="sr-only">{item?.title || 'YouTube Shorts'}</DialogTitle>
        <DialogDescription className="sr-only">YouTube Shorts player</DialogDescription>

        <div className="relative aspect-[9/16] w-full bg-black">
          {item && (
            <iframe
              key={item.videoId}
              src={src}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* 自定义关闭按钮（DialogContent 默认右上角有 X，但深色背景上更明显） */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 hover:bg-black/80 hover:text-white transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

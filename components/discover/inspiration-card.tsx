/**
 * Discover - InspirationCard
 *
 * 单卡：图片或视频；视频卡 hover 自动播放；右下角 Remix 按钮。
 * 直接消费 DiscoverVideo（含 media_type / content_tab 字段），不走 transform。
 */

'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Copy, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { DiscoverVideo } from '@/types/discover'

interface InspirationCardProps {
  item: DiscoverVideo
  onRemix: (item: DiscoverVideo) => void
}

export function InspirationCard({ item, onRemix }: InspirationCardProps) {
  const t = useTranslations('studio')
  const [isHovered, setIsHovered] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isVideo = item.media_type === 'video'

  // 用 id 推一个稳定的卡片高度，避免 masonry 全等高（视觉太规整）
  const height = useMemo(() => {
    const base = 280
    const variation = parseInt(item.id.slice(-2), 36) % 100
    return base + (variation % 120)
  }, [item.id])

  const thumbnail = item.image_url || item.video_url

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 100)
  }, [])

  return (
    <div
      className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 group cursor-pointer"
      style={{ height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 缩略图 / 静态图卡 */}
      {!imageError ? (
        <img
          src={thumbnail}
          alt={item.prompt.slice(0, 60)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isHovered && isVideo && videoLoaded && !videoError ? 'opacity-0' : 'opacity-100'
          )}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center">
          <Play className="w-12 h-12 text-gray-500" />
        </div>
      )}

      {/* Video 元素 — 仅视频类型 + hover 时挂载 */}
      {isVideo && isHovered && (
        <video
          src={item.video_url}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
            videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
          )}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => { setVideoLoaded(true); setVideoError(false) }}
          onError={() => setVideoError(true)}
          onLoadStart={() => setVideoLoaded(false)}
        />
      )}

      {/* Hover 渐变蒙层 */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300',
        isHovered ? 'opacity-100' : 'opacity-0'
      )} />

      {/* Remix 按钮 — 移动端始终可见；桌面 hover 才浮现 */}
      <div className="absolute bottom-3 right-3">
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onRemix(item) }}
          className={cn(
            'bg-white/90 hover:bg-white text-black text-xs px-3 py-1.5 h-auto transition-all duration-300 backdrop-blur-sm',
            // 桌面跟 isHovered 走（淡入 + 上移），移动端覆盖成始终可见
            isHovered ? 'sm:opacity-100 sm:translate-y-0' : 'sm:opacity-0 sm:translate-y-2',
            'opacity-100 translate-y-0'
          )}
        >
          <Copy className="w-3 h-3 mr-1" />
          {t('discover.remix')}
        </Button>
      </div>

      {/* 静态时的播放图标提示（仅视频） */}
      {isVideo && !isHovered && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  )
}

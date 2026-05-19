/**
 * VidFab Suite — 6 个工具卡（极简版：icon + 标题 + 一句话）
 *
 * 数据源：复用 lib/config/studio-tools 的 url，避免与 sidebar 出现偏差。
 */

'use client'

import Image from 'next/image'
import { Wand2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { defaultLocale } from '@/i18n/locale'

interface SuiteItem {
  /** 用作 i18n key (studio.discover.suite.<key>.label / .description) */
  key: 'storyToVideo' | 'textToVideo' | 'imageToVideo' | 'videoEffects' | 'textToImage' | 'imageToImage'
  iconPath?: string
  icon?: React.ElementType
  url: string
}

const SUITE: SuiteItem[] = [
  { key: 'storyToVideo', icon: Wand2, url: '/studio/video-agent-beta' },
  { key: 'textToVideo', iconPath: '/logo/text-to-video.svg', url: '/studio/text-to-video' },
  { key: 'imageToVideo', iconPath: '/logo/image-to-video.svg', url: '/studio/image-to-video' },
  { key: 'videoEffects', iconPath: '/logo/video-effects.svg', url: '/studio/ai-video-effects' },
  { key: 'textToImage', iconPath: '/logo/text-to-image.svg', url: '/studio/text-to-image' },
  { key: 'imageToImage', iconPath: '/logo/image-to-image.svg', url: '/studio/image-to-image' },
]

export function VidfabSuite() {
  const t = useTranslations('studio.discover')
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`

  return (
    <section className="space-y-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('suiteTitle')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {SUITE.map(item => {
          const label = t(`suite.${item.key}.label` as any)
          const description = t(`suite.${item.key}.description` as any)
          return (
            <Link
              key={item.key}
              href={`${localePrefix}${item.url}` as any}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-5 transition-all hover:border-purple-500/40 hover:from-purple-900/20 hover:to-blue-900/10"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center transition-colors group-hover:bg-purple-500/20">
                  {item.icon
                    ? <item.icon className="w-5 h-5 text-purple-300" />
                    : <Image src={item.iconPath!} alt="" width={24} height={24} className="opacity-90" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold text-base">{label}</div>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">{description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

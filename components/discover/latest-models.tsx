/**
 * Latest AI Models — 模型展示模块（PDF 第 2 部分需求）
 *
 * 卡片直接跳转到对应 marketing 落地页 (/tools/veo3 / /tools/kling3)。
 * 视觉占位：渐变背景 + 模型名 + 一句话；未来可替换为真实 demo 视频/poster。
 */

'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { defaultLocale } from '@/i18n/locale'
import { ArrowUpRight } from 'lucide-react'

interface ModelCard {
  /** i18n key (studio.discover.models.<key>.tagline / .badge) — name 是品牌名不翻译 */
  key: 'veo3' | 'kling3'
  /** 品牌显示名（不翻译） */
  name: string
  href: string
  gradient: string
}

const MODELS: ModelCard[] = [
  { key: 'veo3', name: 'Veo 3', href: '/tools/veo3', gradient: 'from-indigo-600 via-blue-600 to-cyan-500' },
  { key: 'kling3', name: 'Kling 3.0', href: '/tools/kling3', gradient: 'from-purple-600 via-fuchsia-500 to-pink-500' },
]

export function LatestModels() {
  const t = useTranslations('studio.discover')
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`

  return (
    <section className="space-y-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('latestModelsTitle')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODELS.map(m => {
          const tagline = t(`models.${m.key}.tagline` as any)
          const badge = t(`models.${m.key}.badge` as any)
          return (
            <Link
              key={m.key}
              href={`${localePrefix}${m.href}` as any}
              className="group relative overflow-hidden rounded-2xl border border-white/10 transition-all hover:border-white/30 hover:scale-[1.01]"
            >
              <div className={`bg-gradient-to-br ${m.gradient} p-6 sm:p-7 h-40 sm:h-48 flex flex-col justify-between`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{m.name}</span>
                    {badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 bg-white/15 border border-white/25 rounded-full backdrop-blur-sm">
                        {badge}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-sm text-white/90 max-w-xs leading-snug">{tagline}</p>
              </div>

              {/* 微光纹理 */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

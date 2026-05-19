/**
 * Discover Hero — 大标题
 *
 * 仿 OpenArt：「What would you like to **create** in VidFab?」
 */

'use client'

import { useTranslations } from 'next-intl'

export function DiscoverHero() {
  const t = useTranslations('studio.discover')

  return (
    <div className="text-center py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
        <span className="text-white">{t('heroTitle')} </span>
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          {t('heroAccent')}
        </span>
        <span className="text-white"> {t('heroSuffix')}</span>
      </h1>
      <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
        {t('heroSubtitle')}
      </p>
    </div>
  )
}

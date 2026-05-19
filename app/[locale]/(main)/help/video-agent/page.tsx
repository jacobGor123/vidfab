/**
 * Video Agent Help / Guide
 *
 * 操作指引页 — 基于代码现状写的通用教程，泳仪后续可替换 messages/{locale}/studio.json 的 guide.* key。
 * 计划逐步并入 vidfab support 中心：订阅管理 / 操作指引（本页）/ 创作资产指引
 *
 * 所有文案走 i18n，4 locale (en/zh/ja/de) 已填真翻译。
 * 视觉：纯文本驱动，无装饰图标（按用户反馈精简）。
 */

'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { defaultLocale } from '@/i18n/locale'

export default function VideoAgentGuidePage() {
  const t = useTranslations('studio.guide')
  const tStory = useTranslations('studio.storyToVideo')
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`
  const studioHref = `${localePrefix}/studio/video-agent-beta`

  return (
    <div className="text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-20 sm:py-24">
        {/* Back link */}
        <Link
          href={studioHref}
          className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-10"
        >
          ← {tStory('backToVideoAgent')}
        </Link>

        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{t('title')}</h1>
        <p className="text-slate-400 mb-20">{t('subtitle')}</p>

        {/* Section 1: Intro */}
        <Section heading={t('introHeading')}>
          <p className="text-slate-300 leading-relaxed">{t('introBody')}</p>
        </Section>

        {/* Section 2: Two ways */}
        <Section heading={t('twoWaysHeading')} subhead={t('twoWaysSubhead')}>
          <PathCard
            title={t('referencePathTitle')}
            badge={t('referencePathBadge')}
            steps={[
              { title: t('referenceStep1Title'), body: t('referenceStep1Body') },
              { title: t('referenceStep2Title'), body: t('referenceStep2Body') },
              { title: t('referenceStep3Title'), body: t('referenceStep3Body') },
              { title: t('referenceStep4Title'), body: t('referenceStep4Body') },
            ]}
          />

          <PathCard
            title={t('myselfPathTitle')}
            steps={[
              { title: t('myselfStep1Title'), body: t('myselfStep1Body') },
              { title: t('myselfStep2Title'), body: t('myselfStep2Body') },
              { title: t('myselfStep3Title'), body: t('myselfStep3Body') },
            ]}
          />
        </Section>

        {/* Section 3: Behind the scenes */}
        <Section heading={t('behindHeading')} subhead={t('behindSubhead')}>
          <div className="grid sm:grid-cols-2 gap-3">
            <StageCard title={t('stageScriptTitle')} body={t('stageScriptBody')} />
            <StageCard title={t('stageCharacterTitle')} body={t('stageCharacterBody')} />
            <StageCard title={t('stageStoryboardTitle')} body={t('stageStoryboardBody')} />
            <StageCard title={t('stageCompositionTitle')} body={t('stageCompositionBody')} />
          </div>
        </Section>

        {/* Section 4: Tips */}
        <Section heading={t('tipsHeading')}>
          <ul className="space-y-2.5 pl-1">
            {[t('tip1'), t('tip2'), t('tip3'), t('tip4')].map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed">
                <span className="text-slate-600 flex-shrink-0 mt-px">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Section 5: FAQ */}
        <Section heading={t('faqHeading')}>
          <div className="space-y-3">
            <FaqItem q={t('faq1Q')} a={t('faq1A')} />
            <FaqItem q={t('faq2Q')} a={t('faq2A')} />
            <FaqItem q={t('faq3Q')} a={t('faq3A')} />
          </div>
        </Section>

        {/* Footer CTA */}
        <div className="mt-24 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-5">{t('footerCtaTitle')}</h3>
          <Link
            href={studioHref}
            className="inline-block rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-12 py-4 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
          >
            {t('footerCtaButton')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({
  heading,
  subhead,
  children,
}: {
  heading: string
  subhead?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-20">
      <h2 className="text-2xl font-bold text-white mb-2">{heading}</h2>
      {subhead && <p className="text-sm text-slate-400 mb-6">{subhead}</p>}
      <div className={subhead ? '' : 'mt-6'}>{children}</div>
    </section>
  )
}

function PathCard({
  title,
  badge,
  steps,
}: {
  title: string
  badge?: string
  steps: Array<{ title: string; body: string }>
}) {
  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-slate-900/40 p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200 bg-purple-500/15 border border-purple-400/30 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-sm font-semibold text-slate-500 leading-relaxed flex-shrink-0 w-5">
              {i + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{s.title}</div>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function StageCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border border-white/10 bg-slate-900/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white flex items-center justify-between hover:bg-white/[0.03] rounded-lg">
        <span>{q}</span>
        <span className="text-slate-500 text-xs transition-transform group-open:rotate-90">▶</span>
      </summary>
      <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">{a}</p>
    </details>
  )
}

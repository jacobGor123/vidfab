"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { ToolHero } from "@/components/tools/tool-hero"
import { ToolBuilder } from "@/components/tools/tool-builder"
import { FeaturesOptionB } from "@/components/tools/features-option-b"
import { PromptShowcase } from "@/components/tools/prompt-showcase"
import { CreatorTypes } from "@/components/tools/creator-types"
import { FAQSection } from "@/components/sections/faq-section"
import { LoadingState } from "@/components/loading-state"
import { kling3Config } from "@/lib/tools/tool-configs"
import { useTranslations } from "next-intl"

const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then((m) => ({ default: m.CommunityCTA })),
  { loading: () => <LoadingState message="Loading..." />, ssr: false }
)

export default function Kling3Client() {
  const t = useTranslations('kling3')

  const features = (t.raw('features') as any[]).map((f: any) => ({
    title: f.title,
    description: f.description,
  }))

  const promptCategories = t.raw('promptCategories') as string[]
  const prompts = kling3Config.prompts.map((p, i) => ({
    ...p,
    category: promptCategories[i] ?? p.category,
  }))

  const creatorTypes = (t.raw('creatorTypes') as any[]).map((c: any, i: number) => ({
    icon: kling3Config.creatorTypes[i]?.icon,
    title: c.title,
    description: c.description,
  }))

  const heroConfig = {
    badge: t('hero.badge'),
    h1: t('hero.h1'),
    description: t('hero.description'),
    ctaText: t('hero.ctaText'),
    ctaHref: kling3Config.hero.ctaHref,
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <ToolHero config={{ ...heroConfig, slug: kling3Config.slug }} />

      <Suspense fallback={<LoadingState message="Loading Kling 3.0 Playground..." />}>
        <ToolBuilder
          config={{ ...kling3Config, builderTitle: t('builderTitle'), builderSubtitle: t('builderSubtitle') }}
          className="bg-brand-gray-900/30"
        />
      </Suspense>

      <FeaturesOptionB
        title={t('featuresTitle')}
        features={features}
      />

      <PromptShowcase
        title={t('promptShowcaseTitle')}
        subtitle={t('promptShowcaseSubtitle')}
        prompts={prompts}
      />

      <CreatorTypes
        title={t('creatorTypesTitle')}
        types={creatorTypes}
      />

      <FAQSection
        title={t('faqTitle')}
        faqs={t.raw('faqs') as any[]}
      />

      <CommunityCTA
        title={t('ctaTitle')}
        subtitle=""
        description={t('ctaDescription')}
        ctaText={t('ctaButtonText')}
        playgroundId="kling3-playground"
        getInspiredText=""
        showVideos={false}
      />
    </div>
  )
}

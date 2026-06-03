"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Link } from "@/i18n/routing"
import { ArrowRight } from "lucide-react"
import { ToolHero } from "@/components/tools/tool-hero"
import { ToolBuilder } from "@/components/tools/tool-builder"
import { EffectToolBuilder } from "@/components/tools/effect-tool-builder"
import { StudioRedirectPanel } from "@/components/tools/studio-redirect-panel"
import { FeaturesOptionB } from "@/components/tools/features-option-b"
import { PromptShowcase } from "@/components/tools/prompt-showcase"
import { StoryInputShowcase } from "@/components/tools/story-input-showcase"
import { CreatorTypes } from "@/components/tools/creator-types"
import { FAQSection } from "@/components/sections/faq-section"
import { LoadingState } from "@/components/loading-state"
import type { SeoToolPageConfig } from "@/lib/tools/seo-tool-configs"
import type { ToolPageConfig } from "@/lib/tools/tool-configs"

const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then((module) => ({ default: module.CommunityCTA })),
  { loading: () => <LoadingState message="Loading..." />, ssr: false }
)

function LeadHero({ config }: { config: SeoToolPageConfig }) {
  if (config.kind !== "lead") return null

  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden pt-28 pb-16">
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 140% 120% at 50% -5%, rgba(124,58,237,0.55) 0%, transparent 65%)",
            "linear-gradient(to bottom, #160a36 0%, #0a0520 45%, #04020f 100%)",
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-gradient-brand leading-tight mb-6">
            {config.hero.h1}
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {config.hero.description}
          </p>

          <Link
            href={config.redirectPanel.ctaHref}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            {config.hero.ctaText}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function toToolBuilderConfig(config: SeoToolPageConfig): ToolPageConfig | null {
  if (config.kind !== "model") return null

  return {
    slug: config.slug,
    modelDisplayName: config.modelDisplayName,
    hero: config.hero,
    builder: config.builder,
    builderTitle: config.builderTitle,
    builderSubtitle: config.builderSubtitle,
    featuresTitle: config.featuresTitle,
    features: config.features,
    promptShowcaseTitle: config.promptShowcaseTitle,
    promptShowcaseSubtitle: config.promptShowcaseSubtitle,
    prompts: config.prompts,
    creatorTypesTitle: config.creatorTypesTitle,
    creatorTypes: config.creatorTypes,
    faqs: config.faqs,
    ctaTitle: config.ctaTitle,
    ctaDescription: config.ctaDescription,
    ctaButtonText: config.ctaButtonText,
  }
}

export function SeoToolPage({ config }: { config: SeoToolPageConfig }) {
  const modelToolConfig = toToolBuilderConfig(config)

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {config.kind === "lead" ? (
        <LeadHero config={config} />
      ) : (
        <ToolHero config={{ ...config.hero, slug: config.slug }} />
      )}

      {config.kind === "model" && modelToolConfig && (
        <Suspense fallback={<LoadingState message={`Loading ${config.modelDisplayName} Playground...`} />}>
          <ToolBuilder config={modelToolConfig} className="bg-brand-gray-900/30" />
        </Suspense>
      )}

      {config.kind === "effect" && (
        <Suspense fallback={<LoadingState message="Loading effect playground..." />}>
          <EffectToolBuilder
            slug={config.slug}
            config={config.effectBuilder}
            className="bg-brand-gray-900/30"
          />
        </Suspense>
      )}

      {config.kind === "lead" && (
        <StudioRedirectPanel slug={config.slug} config={config.redirectPanel} />
      )}

      <FeaturesOptionB title={config.featuresTitle} features={config.features} />

      {config.storyInputExamples ? (
        <StoryInputShowcase
          title={config.promptShowcaseTitle}
          subtitle={config.promptShowcaseSubtitle}
          examples={config.storyInputExamples}
        />
      ) : (
        <PromptShowcase
          title={config.promptShowcaseTitle}
          subtitle={config.promptShowcaseSubtitle}
          prompts={config.prompts}
          promptLabel={config.promptShowcaseLabel}
          variant={config.promptShowcaseVariant}
        />
      )}

      <CreatorTypes title={config.creatorTypesTitle} types={config.creatorTypes} />

      <FAQSection title={config.faqTitle} faqs={config.faqs} />

      <CommunityCTA
        title={config.ctaTitle}
        subtitle=""
        description={config.ctaDescription}
        ctaText={config.ctaButtonText}
        ctaLink={config.kind === "lead" ? config.redirectPanel.ctaHref : undefined}
        playgroundId={config.kind === "lead" ? undefined : `${config.slug}-playground`}
        getInspiredText=""
        showVideos={false}
      />
    </div>
  )
}

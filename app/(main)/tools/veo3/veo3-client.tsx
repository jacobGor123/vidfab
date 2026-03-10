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
import { veo3Config } from "@/lib/tools/tool-configs"

const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then((m) => ({ default: m.CommunityCTA })),
  { loading: () => <LoadingState message="Loading..." />, ssr: false }
)

export default function Veo3Client() {
  const features = veo3Config.features.map((f) => ({
    title: f.title,
    description: f.description,
  }))

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Hero */}
      <ToolHero config={{ ...veo3Config.hero, slug: veo3Config.slug }} />

      {/* Builder (Playground) */}
      <Suspense fallback={<LoadingState message="Loading Veo 3 Playground..." />}>
        <ToolBuilder config={veo3Config} className="bg-brand-gray-900/30" />
      </Suspense>

      {/* Features */}
      <FeaturesOptionB
        title={veo3Config.featuresTitle}
        features={features}
      />

      {/* Prompt Showcase */}
      <PromptShowcase
        title={veo3Config.promptShowcaseTitle}
        subtitle={veo3Config.promptShowcaseSubtitle}
        prompts={veo3Config.prompts}
      />

      {/* Creator Types */}
      <CreatorTypes
        title={veo3Config.creatorTypesTitle}
        types={veo3Config.creatorTypes}
      />

      {/* FAQ */}
      <FAQSection
        title="Frequently Asked Questions"
        faqs={veo3Config.faqs}
      />

      {/* CTA */}
      <CommunityCTA
        title={veo3Config.ctaTitle}
        subtitle=""
        description={veo3Config.ctaDescription}
        ctaText={veo3Config.ctaButtonText}
        ctaLink="/studio/text-to-video"
        getInspiredText=""
        showVideos={false}
      />
    </div>
  )
}

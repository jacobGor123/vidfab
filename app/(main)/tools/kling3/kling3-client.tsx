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

const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then((m) => ({ default: m.CommunityCTA })),
  { loading: () => <LoadingState message="Loading..." />, ssr: false }
)

export default function Kling3Client() {
  const features = kling3Config.features.map((f) => ({
    title: f.title,
    description: f.description,
  }))

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <ToolHero config={{ ...kling3Config.hero, slug: kling3Config.slug }} />

      <Suspense fallback={<LoadingState message="Loading Kling 3.0 Playground..." />}>
        <ToolBuilder config={kling3Config} className="bg-brand-gray-900/30" />
      </Suspense>

      <FeaturesOptionB
        title={kling3Config.featuresTitle}
        features={features}
      />

      <PromptShowcase
        title={kling3Config.promptShowcaseTitle}
        subtitle={kling3Config.promptShowcaseSubtitle}
        prompts={kling3Config.prompts}
      />

      <CreatorTypes
        title={kling3Config.creatorTypesTitle}
        types={kling3Config.creatorTypes}
      />

      <FAQSection
        title="Frequently Asked Questions"
        faqs={kling3Config.faqs}
      />

      <CommunityCTA
        title={kling3Config.ctaTitle}
        subtitle=""
        description={kling3Config.ctaDescription}
        ctaText={kling3Config.ctaButtonText}
        ctaLink="/studio/text-to-video"
        getInspiredText=""
        showVideos={false}
      />
    </div>
  )
}

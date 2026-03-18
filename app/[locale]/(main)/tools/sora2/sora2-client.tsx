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
import { sora2Config } from "@/lib/tools/tool-configs"

const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then((m) => ({ default: m.CommunityCTA })),
  { loading: () => <LoadingState message="Loading..." />, ssr: false }
)

export default function Sora2Client() {
  const features = sora2Config.features.map((f) => ({
    title: f.title,
    description: f.description,
  }))

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <ToolHero config={{ ...sora2Config.hero, slug: sora2Config.slug }} />

      <Suspense fallback={<LoadingState message="Loading Sora 2 Playground..." />}>
        <ToolBuilder config={sora2Config} className="bg-brand-gray-900/30" />
      </Suspense>

      <FeaturesOptionB
        title={sora2Config.featuresTitle}
        features={features}
      />

      <PromptShowcase
        title={sora2Config.promptShowcaseTitle}
        subtitle={sora2Config.promptShowcaseSubtitle}
        prompts={sora2Config.prompts}
      />

      <CreatorTypes
        title={sora2Config.creatorTypesTitle}
        types={sora2Config.creatorTypes}
      />

      <FAQSection
        title="Frequently Asked Questions"
        faqs={sora2Config.faqs}
      />

      <CommunityCTA
        title={sora2Config.ctaTitle}
        subtitle=""
        description={sora2Config.ctaDescription}
        ctaText={sora2Config.ctaButtonText}
        playgroundId="sora2-playground"
        getInspiredText=""
        showVideos={false}
      />
    </div>
  )
}

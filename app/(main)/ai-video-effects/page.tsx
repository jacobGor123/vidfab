"use client"

import { Suspense } from "react"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { CommunityCTA } from "@/components/sections/community-cta"
import { LoadingState } from "@/components/loading-state"
import { VideoBackground } from "@/components/video-hero/video-background"
import { useVideoPool } from "@/components/video-hero/hooks/use-video-pool"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { HERO_VIDEO_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { usePageTranslation } from "@/lib/i18n"
import Link from "next/link"
import { Layers, Upload, Sparkles, Download } from "lucide-react"

function AIVideoEffectsHero() {
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()
  const { translations } = usePageTranslation('ai-video-effects')

  const { getVideo, isVideoReady } = useVideoPool(HERO_VIDEO_ITEMS, false)

  const { state, controls } = useVideoCarousel({
    items: HERO_VIDEO_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (HERO_VIDEO_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={HERO_VIDEO_ITEMS}
          currentIndex={state.currentIndex}
          getVideo={getVideo}
          isVideoReady={isVideoReady}
          onVideoEnd={handleVideoEnd}
          className="absolute inset-0 z-0"
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-black" />
      )}

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center container mx-auto px-4 text-center">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-5xl md:text-7xl font-heading font-extrabold mb-8 text-gradient-brand leading-tight">
            {translations?.hero?.title || "Enhance Your Videos With Stunning AI-Powered Video Effects"}
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            {translations?.hero?.subtitle || "Transform ordinary clips into eye-catching videos with AI-driven effects."}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/create?tool=video-effects"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {translations?.hero?.cta || "Try AI Video Effects for Free"}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AIVideoEffectsPage() {
  const { translations } = usePageTranslation('ai-video-effects')

  // Build steps from translations
  const steps: Step[] = translations?.howItWorks?.steps?.map((step: any, index: number) => ({
    id: `step-${index + 1}`,
    number: step.number,
    title: step.title,
    description: step.description,
    image: `/placeholder/ai-video-effects-step-${index + 1}.jpg`,
    icon: [Layers, Upload, Sparkles, Download][index]
  })) || []

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading AI Video Effects..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <AIVideoEffectsHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* How It Works Section */}
            <HowItWorks steps={steps} />

            {/* FAQ Section */}
            <FAQSection
              title={translations?.faq?.title || "FAQ"}
              subtitle={translations?.faq?.subtitle}
              faqs={translations?.faq?.items || []}
            />

            {/* Community CTA Section */}
            <CommunityCTA
              title={translations?.community?.title || "Find More Inspirations in VidFab Community"}
              subtitle={translations?.community?.subtitle || "Find your inspiration in a sea of creativity"}
              description={translations?.community?.description || "Explore unlimited inspiration alongside other VidFab users."}
              ctaText={translations?.community?.cta || "Discover Now"}
              getInspiredText={translations?.community?.getInspiredButton || "Get Inspired"}
            />
          </div>
        </main>
      </Suspense>
    </div>
  )
}

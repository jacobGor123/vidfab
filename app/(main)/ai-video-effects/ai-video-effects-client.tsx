"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { LoadingState } from "@/components/loading-state"
import { VideoBackground } from "@/components/video-hero/video-background"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { AI_VIDEO_EFFECTS_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { usePageTranslation } from "@/lib/i18n"
import Link from "next/link"
import { Layers, Upload, Sparkles, Download } from "lucide-react"

// 动态导入 CommunityCTA
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community videos..." />,
    ssr: false,
  }
)

function AIVideoEffectsHero() {
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()
  const { translations } = usePageTranslation('ai-video-effects')

  const { state, controls } = useVideoCarousel({
    items: AI_VIDEO_EFFECTS_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (AI_VIDEO_EFFECTS_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={AI_VIDEO_EFFECTS_ITEMS}
          currentIndex={state.currentIndex}
          onVideoEnd={handleVideoEnd}
          onVideoCanPlay={() => {}}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-brand-gray-900 to-black" />
      )}

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center container mx-auto px-4 text-center">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold mb-8 sm:mb-12 text-gradient-brand leading-tight">
            {translations?.hero?.title || "Enhance Your Videos With Stunning AI-Powered Video Effects"}
          </h1>

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
    video: `https://static.vidfab.ai/video-effects/al-video-effects-0${index + 1}.mp4`,
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
              title={translations?.community?.title || "Find More Inspirations in VidFab"}
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

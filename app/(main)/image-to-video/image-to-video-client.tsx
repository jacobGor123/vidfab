"use client"

import { Suspense } from "react"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { CommunityCTA } from "@/components/sections/community-cta"
import { LoadingState } from "@/components/loading-state"
import { VideoBackground } from "@/components/video-hero/video-background"
import { VideoNavigation } from "@/components/video-hero/video-navigation"
import { useVideoPool } from "@/components/video-hero/hooks/use-video-pool"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { IMAGE_TO_VIDEO_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { usePageTranslation } from "@/lib/i18n"
import Link from "next/link"
import { Upload, MousePointerClick, Sparkles, Download } from "lucide-react"

function ImageToVideoHero() {
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()
  const { translations } = usePageTranslation('image-to-video')

  const { getVideo, isVideoReady, loadingCount } = useVideoPool(IMAGE_TO_VIDEO_ITEMS, false)

  const { state, controls } = useVideoCarousel({
    items: IMAGE_TO_VIDEO_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (IMAGE_TO_VIDEO_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={IMAGE_TO_VIDEO_ITEMS}
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
            {translations?.hero?.title || "From Still to Motion: Transform Images Into Videos Instantly"}
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            {translations?.hero?.subtitle || "Upload a single image and let our AI transform it into a smooth, cinematic video."}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/create?tool=image-to-video"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {translations?.hero?.cta || "Generate Your First Video for Free"}
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

      {/* Navigation Layer - Desktop Only */}
      {isDesktop && shouldShowVideoBackground && IMAGE_TO_VIDEO_ITEMS.length > 1 && (
        <VideoNavigation
          items={IMAGE_TO_VIDEO_ITEMS}
          currentIndex={state.currentIndex}
          onItemSelect={(index) => {
            controls.goToIndex(index)
          }}
          isVideoReady={() => true}
          loadingCount={loadingCount}
        />
      )}
    </div>
  )
}

export default function ImageToVideoPage() {
  const { translations } = usePageTranslation('image-to-video')

  // Build steps from translations
  const steps: Step[] = translations?.howItWorks?.steps?.map((step: any, index: number) => ({
    id: `step-${index + 1}`,
    number: step.number,
    title: step.title,
    description: step.description,
    image: `/placeholder/image-to-video-step-${index + 1}.jpg`,
    icon: [Upload, MousePointerClick, Sparkles, Download][index]
  })) || []

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading Image-to-Video..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <ImageToVideoHero />

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

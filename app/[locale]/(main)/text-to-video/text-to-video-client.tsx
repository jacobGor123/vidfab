"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { LoadingState } from "@/components/loading-state"
import { usePageTranslation } from "@/lib/i18n"
import { VideoBackground } from "@/components/video-hero/video-background"
import { TEXT_TO_VIDEO_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import Link from "next/link"
import { FileText, MousePointerClick, Sparkles, Download } from "lucide-react"

// 动态导入 CommunityCTA - 非首屏内容延迟加载
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community videos..." />,
    ssr: false,
  }
)

function TextToVideoHero() {
  const { translations } = usePageTranslation('text-to-video')
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()

  const { state, controls } = useVideoCarousel({
    items: TEXT_TO_VIDEO_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (TEXT_TO_VIDEO_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background for Desktop / Poster for Mobile */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={TEXT_TO_VIDEO_ITEMS}
          currentIndex={state.currentIndex}
          onVideoEnd={handleVideoEnd}
          onVideoCanPlay={() => {}}
        />
      ) : (
        <>
          {/* Mobile: Show poster image as background */}
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${TEXT_TO_VIDEO_ITEMS[0].posterUrl})`,
            }}
          />
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </>
      )}

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center container mx-auto px-4 text-center py-20 md:py-0">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold mb-8 sm:mb-12 text-gradient-brand leading-tight">
            {translations?.hero?.title || "From Script to Screen: Create Videos With Just Text"}
          </h1>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/studio/text-to-video"
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
    </div>
  )
}

export default function TextToVideoPage() {
  const { translations } = usePageTranslation('text-to-video')

  // Build steps from translations
  const steps: Step[] = translations?.howItWorks?.steps?.map((step: any, index: number) => ({
    id: `step-${index + 1}`,
    number: step.number,
    title: step.title,
    description: step.description,
    video: `https://static.vidfab.ai/text-to-video/text-to-video-0${index + 1}.mp4`,
    icon: [FileText, MousePointerClick, Sparkles, Download][index]
  })) || []

  // Key Features data
  const keyFeatures = [
    {
      number: "1",
      title: "Effortless Text Input",
      description: "Turn any script, idea, or keywords into dynamic videos. Script to video has never been easier with VidFab."
    },
    {
      number: "2",
      title: "Real-Time Preview",
      description: "Watch your video come to life while customizing it for your needs."
    },
    {
      number: "3",
      title: "Customizable Visuals",
      description: "Adjust backgrounds, animations, and styles to match your brand."
    },
    {
      number: "4",
      title: "Multi-Language Support",
      description: "Enter your script in any language, and let our AI bring it to life."
    },
    {
      number: "5",
      title: "Process Multiple Tasks",
      description: "Handle up to 4 video generation tasks simultaneously, boosting your efficiency."
    },
    {
      number: "6",
      title: "Browser-Based Workflow",
      description: "Use our video creation tool directly on your browser — no downloads required."
    }
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading Text-to-Video..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <TextToVideoHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* Key Features Section */}
            <AmazingFeatures
              title="Key Features of VidFab Text-to-Video"
              features={keyFeatures}
            />

            {/* How It Works Section */}
            <HowItWorks steps={steps} />

            {/* FAQ Section */}
            <FAQSection
              title={translations?.faq?.title || "FAQ"}
              faqs={translations?.faq?.items || []}
            />

            {/* Community CTA Section */}
            <CommunityCTA
              title="Create Videos With Text Effortlessly"
              subtitle=""
              description="VidFab makes it simple to create engaging videos from text. Don't waste time with complicated tools — our AI video generator does the heavy lifting for you."
              ctaText="Generate Your First Video for Free"
              ctaLink="/studio/text-to-video"
              getInspiredText=""
              showVideos={false}
            />
          </div>
        </main>
      </Suspense>
    </div>
  )
}

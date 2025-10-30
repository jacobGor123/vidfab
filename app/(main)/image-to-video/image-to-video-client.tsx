"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { LoadingState } from "@/components/loading-state"
import { usePageTranslation } from "@/lib/i18n"
import { VideoBackground } from "@/components/video-hero/video-background"
import { IMAGE_TO_VIDEO_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import Link from "next/link"
import { Upload, MousePointerClick, Sparkles, Download } from "lucide-react"

// 动态导入 CommunityCTA
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community videos..." />,
    ssr: false,
  }
)

function ImageToVideoHero() {
  const { translations } = usePageTranslation('image-to-video')
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()

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
            {translations?.hero?.title || "From Still to Motion: Transform Images Into Videos Instantly"}
          </h1>

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
    video: `https://static.vidfab.ai/image-to-video/image-to-video-0${index + 1}.mp4`,
    icon: [Upload, MousePointerClick, Sparkles, Download][index]
  })) || []

  // Key Features data
  const keyFeatures = [
    {
      number: "1",
      title: "Effortless Video Creation",
      description: "Convert images to video in just a few clicks. Upload your photos and let our AI-powered online video maker do the rest."
    },
    {
      number: "2",
      title: "AI-Powered Enhancements",
      description: "Use AI to create image animations, add smooth transitions, and apply effects that bring your visuals to life while captivating your audience."
    },
    {
      number: "3",
      title: "Customized Resolution",
      description: "Select your preferred resolution with one click to optimize your video generation."
    },
    {
      number: "4",
      title: "Multiple Ratio Options",
      description: "Select your desired ratio and use the generated video for easy sharing on social media."
    },
    {
      number: "5",
      title: "Fast and Simple",
      description: "Go from photo to video in under 10 minutes with no compromise on quality."
    }
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading Image-to-Video..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <ImageToVideoHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* Key Features Section */}
            <AmazingFeatures
              title="Key Features of Image-to-Video Conversion"
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
              title={translations?.community?.title || "Create Videos With Text Effortlessly"}
              subtitle={translations?.community?.subtitle || "Find your inspiration in a sea of creativity"}
              description={translations?.community?.description || "VidFab makes it simple to create engaging videos from text. Don't waste time with complicated tools — our AI video generator does the heavy lifting for you."}
              ctaText={translations?.community?.cta || "Generate Your First Video for Free"}
              getInspiredText={translations?.community?.getInspiredButton || "Get Inspired"}
            />
          </div>
        </main>
      </Suspense>
    </div>
  )
}

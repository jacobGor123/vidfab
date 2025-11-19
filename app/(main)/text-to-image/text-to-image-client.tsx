"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { LoadingState } from "@/components/loading-state"
import { usePageTranslation } from "@/lib/i18n"
import { VideoBackground } from "@/components/video-hero/video-background"
import { TEXT_TO_IMAGE_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import Link from "next/link"
import { Type, MousePointerClick, Sparkles, Download } from "lucide-react"

// 动态导入 CommunityCTA - 非首屏内容延迟加载
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community..." />,
    ssr: false,
  }
)

function TextToImageHero() {
  const { translations } = usePageTranslation('text-to-image')
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()

  const { state, controls } = useVideoCarousel({
    items: TEXT_TO_IMAGE_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (TEXT_TO_IMAGE_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background for Desktop / Poster for Mobile */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={TEXT_TO_IMAGE_ITEMS}
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
              backgroundImage: `url(${TEXT_TO_IMAGE_ITEMS[0].posterUrl})`,
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
            {translations?.hero?.title || "From Prompt to Picture: Create Images With Just Text"}
          </h1>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/studio/text-to-image"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {translations?.hero?.cta || "Generate Your First Image for Free"}
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

export default function TextToImageClient() {
  const { translations } = usePageTranslation('text-to-image')

  // How It Works steps
  const steps: Step[] = [
    {
      id: 'step-1',
      number: '1',
      title: 'Enter your prompt',
      description: 'Type or paste a description of the image you want to create. Be as detailed or as simple as you like.',
      video: 'https://static.vidfab.ai/public/video/text-to-image-001.mp4',
      icon: Type
    },
    {
      id: 'step-2',
      number: '2',
      title: 'Click to generate',
      description: 'Our AI gets to work, interpreting your text to create a unique visual.',
      video: 'https://static.vidfab.ai/public/video/text-to-image-02.mp4',
      icon: MousePointerClick
    },
    {
      id: 'step-3',
      number: '3',
      title: 'Process with AI',
      description: 'Your image is generated in seconds, ready for review.',
      video: 'https://static.vidfab.ai/public/video/text-to-image-03.mp4',
      icon: Sparkles
    },
    {
      id: 'step-4',
      number: '4',
      title: 'View and download',
      description: 'Preview your new image online and download it for your projects.',
      video: 'https://static.vidfab.ai/public/video/text-to-image-04.mp4',
      icon: Download
    }
  ]

  // Key Features data
  const keyFeatures = [
    {
      number: "1",
      title: "Effortless Text Input",
      description: "Transform any idea, description, or keyword into a unique image. Converting text to image has never been easier."
    },
    {
      number: "2",
      title: "Powerful AI Models",
      description: "VidFab integrates the most powerful AI models, bringing your concepts to life instantly."
    },
    {
      number: "3",
      title: "Multiple Aspect Ratios",
      description: "Our rich aspect ratio options satisfy all your creative needs. No extra edits needed for final use."
    },
    {
      number: "4",
      title: "Multi-Language Support",
      description: "Enter your text prompts in any language and let our AI art generator craft a beautiful image for you."
    },
    {
      number: "5",
      title: "One-Click Video Creation",
      description: "Instantly turn your generated images into videos with a single click. Maximize every creation and save valuable time."
    },
    {
      number: "6",
      title: "Process Multiple Tasks",
      description: "Handle up to 4 image generation tasks at once, boosting your creative workflow and efficiency."
    }
  ]

  // FAQ data
  const faqs = [
    {
      question: "How does VidFab AI generate images from text?",
      answer: "VidFab uses powerful AI models that transform your written prompts into high-quality visuals. The system interprets the words you provide and generates a unique image that matches your description."
    },
    {
      question: "Is the VidFab AI Image Generator beginner-friendly?",
      answer: "Yes! Our tool is designed with simplicity in mind. No artistic or technical skills are needed. If you can describe it, you can create it."
    },
    {
      question: "What languages are supported for text input?",
      answer: "You can use a wide variety of languages for your text prompts, making it easy for creators around the world to generate art."
    },
    {
      question: "Do I need to download any software?",
      answer: "No. VidFab is a fully browser-based tool. You can start creating images right away without any installation."
    },
    {
      question: "Can I use the generated images for commercial purposes?",
      answer: "Absolutely. The images you create with VidFab are yours to use for marketing, social media, commercial products, and more."
    },
    {
      question: "Can I use the VidFab AI Image Generator for free?",
      answer: "Yes. VidFab will provide 50 credits, allowing you to try generating images and videos initially."
    }
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading Text-to-Image..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <TextToImageHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* Key Features Section */}
            <AmazingFeatures
              title="Key Features of VidFab Text-to-Image"
              features={keyFeatures}
            />

            {/* How It Works Section */}
            <HowItWorks steps={steps} />

            {/* FAQ Section */}
            <FAQSection
              title={translations?.faq?.title || "FAQ"}
              faqs={translations?.faq?.items || faqs}
            />

            {/* Community CTA Section */}
            <CommunityCTA
              title="Create Images With Text Effortlessly"
              subtitle=""
              description="VidFab makes it simple to generate captivating images from your words. Stop struggling with complex design software — our AI image generator does all the creative work for you."
              ctaText="Generate Your First Image for Free"
              getInspiredText=""
              showVideos={false}
            />
          </div>
        </main>
      </Suspense>
    </div>
  )
}

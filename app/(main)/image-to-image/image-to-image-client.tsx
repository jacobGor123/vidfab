"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { LoadingState } from "@/components/loading-state"
import { usePageTranslation } from "@/lib/i18n"
import { VideoBackground } from "@/components/video-hero/video-background"
import { IMAGE_TO_IMAGE_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { useMobileDetection } from "@/components/video-hero/hooks/use-mobile-detection"
import { useNetworkAware } from "@/components/video-hero/hooks/use-network-aware"
import { useVideoCarousel } from "@/components/video-hero/hooks/use-video-carousel"
import Link from "next/link"
import { Upload, FileEdit, Sparkles, Download } from "lucide-react"

// 动态导入 CommunityCTA - 非首屏内容延迟加载
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community..." />,
    ssr: false,
  }
)

function ImageToImageHero() {
  const { translations } = usePageTranslation('image-to-image')
  const { isDesktop } = useMobileDetection()
  const { shouldShowVideoBackground, isSlowConnection } = useNetworkAware()

  const { state, controls } = useVideoCarousel({
    items: IMAGE_TO_IMAGE_ITEMS,
    onIndexChange: () => {},
    autoPlay: isDesktop && !isSlowConnection
  })

  const handleVideoEnd = () => {
    if (IMAGE_TO_IMAGE_ITEMS.length > 1) {
      controls.goToNext()
    }
  }

  return (
    <div className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background for Desktop / Poster for Mobile */}
      {isDesktop && shouldShowVideoBackground ? (
        <VideoBackground
          items={IMAGE_TO_IMAGE_ITEMS}
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
              backgroundImage: `url(${IMAGE_TO_IMAGE_ITEMS[0].posterUrl})`,
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
            {translations?.hero?.title || "From Image to Masterpiece: Reimagine Your Visuals with AI"}
          </h1>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/studio/image-to-image"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {translations?.hero?.cta || "Transform Your First Image for Free"}
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

export default function ImageToImageClient() {
  const { translations } = usePageTranslation('image-to-image')

  // How It Works steps
  const steps: Step[] = [
    {
      id: 'step-1',
      number: '1',
      title: 'Upload your original image',
      description: 'Start by uploading the picture you want to transform.',
      video: 'https://static.vidfab.ai/public/video/image-to-image-01.mp4',
      icon: Upload
    },
    {
      id: 'step-2',
      number: '2',
      title: 'Describe the transformation',
      description: 'Enter a text prompt to guide the AI on what you want to change.',
      video: 'https://static.vidfab.ai/public/video/image-to-image-02.mp4',
      icon: FileEdit
    },
    {
      id: 'step-3',
      number: '3',
      title: 'Process with AI',
      description: 'Our AI gets to work, blending your original image with your text prompt to generate a new masterpiece.',
      video: 'https://static.vidfab.ai/public/video/image-to-image-03.mp4',
      icon: Sparkles
    },
    {
      id: 'step-4',
      number: '4',
      title: 'View and download',
      description: 'Preview your newly generated image and download it for your projects.',
      video: 'https://static.vidfab.ai/public/video/image-to-image-04.mp4',
      icon: Download
    }
  ]

  // Key Features data
  const keyFeatures = [
    {
      number: "1",
      title: "Effortless Image Transformation",
      description: "Upload your image and use simple text prompts to guide the AI. Transforming one image into another has never been so easy."
    },
    {
      number: "2",
      title: "Powerful AI Models",
      description: "No matter what you input, VidFab accurately understands your ideas and lets you watch your original image evolve. Experiment with various styles and see the results generated instantly."
    },
    {
      number: "3",
      title: "Total Creative Control",
      description: "Fine-tune your original pictures by adjusting styles, colors, and composition to perfectly match your artistic vision."
    },
    {
      number: "4",
      title: "Multi-Image Fusion",
      description: "Upload multiple images and provide a description—VidFab AI combines them into a single, realistic composition with seamless precision."
    },
    {
      number: "5",
      title: "Instant Video Creation",
      description: "Turn your images into videos with one click. Save time and bring your creations to life."
    },
    {
      number: "6",
      title: "Process Multiple Tasks",
      description: "Boost your creative workflow by running up to 4 image-to-image tasks at once. Explore more ideas in less time."
    }
  ]

  // FAQ data
  const faqs = [
    {
      question: "How does VidFab AI transform an image into another?",
      answer: "VidFab uses advanced AI models that analyze your uploaded image and text prompt. It then generates a new, unique visual that combines the structure of your original image with the style and elements you described."
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
      <Suspense fallback={<LoadingState message="Loading Image-to-Image..." />}>
        <main>
          {/* Hero Section - Full Screen with Video Background */}
          <ImageToImageHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* Key Features Section */}
            <AmazingFeatures
              title="Key Features of VidFab Image-to-Image"
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
              title="Reimagine Your Images Effortlessly"
              subtitle=""
              description="VidFab makes it simple to turn your existing pictures into new works of art. Stop struggling with complicated editing software—our AI image generator unlocks new creative possibilities for you."
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

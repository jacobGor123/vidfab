"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { HowItWorks, type Step } from "@/components/sections/how-it-works"
import { FAQSection } from "@/components/sections/faq-section"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { LoadingState } from "@/components/loading-state"
import { TEXT_TO_IMAGE_ITEMS } from "@/components/video-hero/config/video-hero.config"
import { HeroContent } from "@/components/video-hero/hero-content"
import { useTranslations } from "next-intl"
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
  const t = useTranslations('text-to-image')
  const currentItem = TEXT_TO_IMAGE_ITEMS[0]

  return (
    <div className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Static Image Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${currentItem.posterUrl})`,
        }}
      />
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      {/* Hero Title */}
      <div className="relative z-10 flex flex-col items-center justify-center container mx-auto px-4 text-center py-20 md:py-0">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold mb-8 sm:mb-12 text-gradient-brand leading-tight">
            {t('hero.title')}
          </h1>

          {/* Typewriter Input + CTA Button from HeroContent */}
          <HeroContent
            currentItem={currentItem}
            targetPath="/studio/text-to-image"
            buttonText={t('hero.cta')}
            showTitle={false}
            showFeatureTags={false}
            className="!min-h-0 !py-0"
          />
        </div>
      </div>
    </div>
  )
}

export default function TextToImageClient() {
  const t = useTranslations('text-to-image')

  const steps: Step[] = (t.raw('howItWorks.steps') as any[])?.map((step: any, index: number) => ({
    id: `step-${index + 1}`,
    number: step.number,
    title: step.title,
    description: step.description,
    video: `https://static.vidfab.ai/public/video/text-to-image-0${index + 1}.mp4`,
    icon: [Type, MousePointerClick, Sparkles, Download][index]
  })) || []

  const keyFeatures = (t.raw('keyFeatures.features') as any[]) || []

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Suspense fallback={<LoadingState message="Loading Text-to-Image..." />}>
        <main>
          {/* Hero Section */}
          <TextToImageHero />

          {/* Content Sections */}
          <div className="relative z-10 bg-black">
            {/* Key Features Section */}
            <AmazingFeatures
              title={t('keyFeatures.title')}
              features={keyFeatures}
            />

            {/* How It Works Section */}
            <HowItWorks title={t('howItWorks.title')} steps={steps} />

            {/* FAQ Section */}
            <FAQSection
              title={t('faq.title')}
              faqs={t.raw('faq.items') as any[]}
            />

            {/* Community CTA Section */}
            <CommunityCTA
              title={t('communityCta.title')}
              subtitle=""
              description={t('communityCta.description')}
              ctaText={t('communityCta.ctaText')}
              ctaLink="/studio/text-to-image"
              getInspiredText=""
              showVideos={false}
            />
          </div>
        </main>
      </Suspense>
    </div>
  )
}

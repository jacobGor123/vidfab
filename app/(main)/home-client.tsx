"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Hero } from "@/components/hero"
import { FeatureShowcase } from "@/components/sections/feature-showcase"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { PaymentSuccessHandler } from "@/components/payment-success-handler"
import { useTranslation } from "@/lib/i18n"
import { LoadingState } from "@/components/loading-state"

// 动态导入 CommunityCTA - 延迟加载减少首屏 JS
const CommunityCTA = dynamic(
  () => import("@/components/sections/community-cta").then(mod => ({ default: mod.CommunityCTA })),
  {
    loading: () => <LoadingState message="Loading community videos..." />,
    ssr: false, // 客户端渲染，因为有大量视频
  }
)

export default function HomeClient() {
  const { t, translations } = useTranslation('en')

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Payment Success Handler - Must be wrapped in Suspense */}
      <Suspense fallback={null}>
        <PaymentSuccessHandler />
      </Suspense>

      <main>
        {/* Hero - Full screen */}
        <div className="relative min-h-screen">
          <Hero />
        </div>

        {/* Content sections */}
        <div className="relative z-10 bg-black mt-16">
          {/* Feature Showcases - 左右交替布局 */}
          <FeatureShowcase
            title={translations?.homepage?.features?.textToVideo?.title || "Generate Video with Text Prompts"}
            subtitle={translations?.homepage?.features?.textToVideo?.subtitle || "Begin by describing what you want to create, then complete the main settings. VidFab will take care of the remaining steps for you."}
            videoUrl="https://static.vidfab.ai/public/video/home-step-01.mp4"
            videoAlt={translations?.homepage?.features?.textToVideo?.imageAlt || "Text to video"}
            layout="left-text"
            categoryText="Text to Video"
            ctaText="Try it now"
            ctaLink="/text-to-video"
          />

          <FeatureShowcase
            title={translations?.homepage?.features?.imageToVideo?.title || "Start a Video Creation with Image"}
            subtitle={translations?.homepage?.features?.imageToVideo?.subtitle || "Upload your images and describe your ideas, and VidFab will bring them to life before your eyes."}
            videoUrl="https://static.vidfab.ai/public/video/home-step-02.mp4"
            videoAlt={translations?.homepage?.features?.imageToVideo?.imageAlt || "Image to video"}
            layout="right-text"
            categoryText="Image to Video"
            ctaText="Try it now"
            ctaLink="/image-to-video"
          />

          <FeatureShowcase
            title={translations?.homepage?.features?.popularEffects?.title || "Pick a Popular Effect in One Click"}
            subtitle={translations?.homepage?.features?.popularEffects?.subtitle || "Try the most popular effects to make your own videos in one step."}
            videoUrl="https://static.vidfab.ai/public/video/home-step-03.mp4"
            videoAlt={translations?.homepage?.features?.popularEffects?.imageAlt || "Popular effects"}
            layout="left-text"
            categoryText="AI Video Effects"
            ctaText="Try it now"
            ctaLink="/ai-video-effects"
          />

          {/* Amazing Features Grid */}
          <AmazingFeatures
            title={translations?.homepage?.amazingFeatures?.title || "Amazing Features of VidFab AI Video Generator"}
            features={translations?.homepage?.amazingFeatures?.items?.map((item: any) => ({
              ...item,
              highlighted: item.number === "5" // Highlight AI Models feature
            })) || [
              { number: "1", title: "User-Friendly Interface for All", description: "Intuitive design that makes video creation accessible to everyone" },
              { number: "2", title: "High-Quality Video Generation: Up to 1080p", description: "Create stunning videos with crystal-clear resolution" },
              { number: "3", title: "Up to an 80% reduction in creation time", description: "Save time with our efficient AI-powered workflow" },
              { number: "4", title: "Diverse Videos Templates Shared within the community", description: "Access a rich library of templates from our creative community" },
              { number: "5", title: "Integration of Several Powerful AI Models", description: "Leverage the best AI models for superior video generation", highlighted: true },
              { number: "6", title: "Data Security Guarantee", description: "Your content and data are protected with enterprise-level security" }
            ]}
          />

          {/* Community CTA */}
          <CommunityCTA
            title={translations?.homepage?.community?.title || "Find More Inspirations in VidFab"}
            subtitle={translations?.homepage?.community?.subtitle || "Find your inspiration in a sea of creativity"}
            description={translations?.homepage?.community?.description || "Explore unlimited inspiration alongside other VidFab users. Let creativity be inspired by shared excitement and collaborative genius."}
            ctaText={translations?.homepage?.community?.cta || "Discover Now"}
            getInspiredText={translations?.homepage?.community?.getInspiredButton || "Get Inspired"}
          />
        </div>
      </main>
    </div>
  )
}

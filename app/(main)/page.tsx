"use client"

import { useState, useEffect, Suspense } from "react"
import { Hero } from "@/components/hero"
import { FeatureShowcase } from "@/components/sections/feature-showcase"
import { AmazingFeatures } from "@/components/sections/amazing-features"
import { CommunityCTA } from "@/components/sections/community-cta"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { PaymentSuccessHandler } from "@/components/payment-success-handler"
import { useTranslation } from "@/lib/i18n"

export default function Home() {
  const [loading, setLoading] = useState(true)
  const { t, translations } = useTranslation('en')

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // Debug log
  console.log('Homepage translations:', translations)

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        {/* Keep the existing SkeletonLoader structure for the page content */}
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <SkeletonLoader type="title" className="mx-auto mb-6" />
            <SkeletonLoader type="text" count={3} className="mx-auto mb-12" />

            <div className="max-w-3xl mx-auto relative">
              <SkeletonLoader type="text" className="h-16 rounded-lg mb-10" />
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-20">
              <SkeletonLoader className="h-10 w-40 rounded-full" />
              <SkeletonLoader className="h-10 w-40 rounded-full" />
              <SkeletonLoader className="h-10 w-40 rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
          </div>
        </div>
        {/* Updated LoadingState message */}
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Initializing NeuralArchive Platform..." />
        </div>
      </div>
    )
  }

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
        <div className="relative z-10 bg-black">
          {/* Feature Showcases - 左右交替布局 */}
          <FeatureShowcase
            title={translations?.homepage?.features?.textToVideo?.title || "Generate Video with Text Prompts"}
            subtitle={translations?.homepage?.features?.textToVideo?.subtitle || "Begin by describing what you want to create, then complete the main settings. VidFab will take care of the remaining steps for you."}
            imageUrl="/placeholder/text-to-video.jpg"
            imageAlt={translations?.homepage?.features?.textToVideo?.imageAlt || "Text to video"}
            layout="left-text"
          />

          <FeatureShowcase
            title={translations?.homepage?.features?.imageToVideo?.title || "Start a Video Creation with Image"}
            subtitle={translations?.homepage?.features?.imageToVideo?.subtitle || "Upload your images and describe your ideas, and VidFab will bring them to life before your eyes."}
            imageUrl="/placeholder/image-to-video.jpg"
            imageAlt={translations?.homepage?.features?.imageToVideo?.imageAlt || "Image to video"}
            layout="right-text"
          />

          <FeatureShowcase
            title={translations?.homepage?.features?.popularEffects?.title || "Pick a Popular Effect in One Click"}
            subtitle={translations?.homepage?.features?.popularEffects?.subtitle || "Try the most popular effects to make your own videos in one step."}
            imageUrl="/placeholder/popular-effects.jpg"
            imageAlt={translations?.homepage?.features?.popularEffects?.imageAlt || "Popular effects"}
            layout="left-text"
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
            title={translations?.homepage?.community?.title || "Find More Inspirations in VidFab Community"}
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

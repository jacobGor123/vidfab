"use client"

import { LazyVideo } from "@/components/common/lazy-video"
import { cn } from "@/lib/utils"

interface FeatureShowcaseProps {
  title: string
  subtitle: string
  videoUrl: string // 改为 videoUrl
  videoAlt: string // 改为 videoAlt
  layout?: "left-text" | "right-text"
  className?: string
}

export function FeatureShowcase({
  title,
  subtitle,
  videoUrl,
  videoAlt,
  layout = "left-text",
  className
}: FeatureShowcaseProps) {
  const isLeftText = layout === "left-text"

  return (
    <section className={cn("py-12", className)}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "grid gap-12 items-center",
          "lg:grid-cols-2 lg:gap-16",
          !isLeftText && "lg:direction-rtl"
        )}>
          {/* Text Content */}
          <div
            className={cn(
              "space-y-6",
              !isLeftText && "lg:order-2"
            )}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Video */}
          <div
            className={cn(
              "relative aspect-video overflow-hidden rounded-xl",
              "bg-brand-gray-800/50 border border-brand-gray-700",
              "shadow-xl",
              !isLeftText && "lg:order-1"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-DEFAULT/10 to-brand-pink-DEFAULT/10 pointer-events-none z-10" />
            <LazyVideo
              src={videoUrl}
              alt={videoAlt}
              className="absolute inset-0"
              autoPlay={true}
              loop={true}
              muted={true}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
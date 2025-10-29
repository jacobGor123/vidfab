"use client"

import { LazyVideo } from "@/components/common/lazy-video"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

interface FeatureShowcaseProps {
  title: string
  subtitle: string
  videoUrl: string
  videoAlt: string
  layout?: "left-text" | "right-text"
  className?: string
  categoryText?: string // 左上角分类展示文案
  categoryLink?: string // 左上角分类链接
  ctaText?: string // CTA 按钮文案
  ctaLink?: string // CTA 按钮链接
}

export function FeatureShowcase({
  title,
  subtitle,
  videoUrl,
  videoAlt,
  layout = "left-text",
  className,
  categoryText,
  categoryLink,
  ctaText,
  ctaLink
}: FeatureShowcaseProps) {
  const isLeftText = layout === "left-text"

  return (
    <section className={cn("py-8 md:py-12", className)}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "grid gap-8 md:gap-12 items-center",
          "lg:grid-cols-2 lg:gap-16",
          !isLeftText && "lg:direction-rtl"
        )}>
          {/* Text Content */}
          <div
            className={cn(
              "space-y-4 md:space-y-6",
              !isLeftText && "lg:order-2"
            )}
          >
            {/* Category Label */}
            {categoryText && (
              categoryLink ? (
                <Link
                  href={categoryLink}
                  className="inline-flex items-center gap-2 mb-4 group hover:scale-105 transition-transform duration-300"
                >
                  <Image
                    src="/cta-icon.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300"
                  />
                  <span className="text-lg font-semibold bg-gradient-to-r from-[#E34C9B] via-[#AC4FFF] via-[#7254FF] via-[#497CFF] to-[#3EDEFB] bg-clip-text text-transparent">
                    {categoryText}
                  </span>
                </Link>
              ) : (
                <div className="inline-flex items-center gap-2 mb-4">
                  <Image
                    src="/cta-icon.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span className="text-lg font-semibold bg-gradient-to-r from-[#E34C9B] via-[#AC4FFF] via-[#7254FF] via-[#497CFF] to-[#3EDEFB] bg-clip-text text-transparent">
                    {categoryText}
                  </span>
                </div>
              )
            )}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
              {title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
              {subtitle}
            </p>

            {/* CTA Button */}
            {ctaText && ctaLink && (
              <div className="pt-4">
                <Link
                  href={ctaLink}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8A2BE2] to-[#6A1DAD] hover:from-[#9D3FF5] hover:to-[#7B2EBE] text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  {ctaText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
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
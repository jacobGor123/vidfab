"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface FeatureShowcaseProps {
  title: string
  subtitle: string
  imageUrl: string
  imageAlt: string
  layout?: "left-text" | "right-text"
  className?: string
}

export function FeatureShowcase({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  layout = "left-text",
  className
}: FeatureShowcaseProps) {
  const isLeftText = layout === "left-text"

  return (
    <section className={cn("py-20", className)}>
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

          {/* Image */}
          <div
            className={cn(
              "relative aspect-video overflow-hidden rounded-xl",
              "bg-brand-gray-800/50 border border-brand-gray-700",
              "shadow-xl",
              !isLeftText && "lg:order-1"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-DEFAULT/10 to-brand-pink-DEFAULT/10" />
            {imageUrl.startsWith("http") || imageUrl.startsWith("/") ? (
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-brand-purple-DEFAULT to-brand-pink-DEFAULT rounded-2xl animate-pulse" />
                  <p className="text-gray-500 text-sm">Image placeholder</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
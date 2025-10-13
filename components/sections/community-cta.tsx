"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CommunityImage {
  url: string
  alt: string
  username?: string
}

interface CommunityCTAProps {
  title: string
  subtitle: string
  description: string
  ctaText: string
  getInspiredText: string
  images?: CommunityImage[]
  className?: string
}

const defaultImages: CommunityImage[] = [
  { url: "/placeholder/community-1.jpg", alt: "Community creation 1" },
  { url: "/placeholder/community-2.jpg", alt: "Community creation 2" },
  { url: "/placeholder/community-3.jpg", alt: "Community creation 3" },
  { url: "/placeholder/community-4.jpg", alt: "Community creation 4" },
  { url: "/placeholder/community-5.jpg", alt: "Community creation 5" },
  { url: "/placeholder/community-6.jpg", alt: "Community creation 6" },
  { url: "/placeholder/community-7.jpg", alt: "Community creation 7" },
  { url: "/placeholder/community-8.jpg", alt: "Community creation 8" }
]

export function CommunityCTA({
  title,
  subtitle,
  description,
  ctaText,
  getInspiredText,
  images = defaultImages,
  className
}: CommunityCTAProps) {
  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      <div className="container mx-auto px-4">
        {/* Title Section - Centered */}
        <div className="text-center mb-12 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
            {title}
          </h2>
          <Button
            size="lg"
            className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white hover:opacity-90 transition-opacity"
            asChild
          >
            <Link href="/create">
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Image Gallery Grid */}
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3 max-w-6xl mx-auto">
          {images.map((image, index) => (
            <div
              key={index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg",
                "bg-brand-gray-800/50 border border-brand-gray-700",
                "group cursor-pointer transition-all duration-300",
                "hover:scale-105 hover:z-10 hover:shadow-2xl"
              )}
            >
              {image.url.startsWith("http") || image.url.startsWith("/") ? (
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-brand-purple-DEFAULT/20 to-brand-pink-DEFAULT/20">
                  <div className="w-8 h-8 bg-white/10 rounded animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-pink-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}
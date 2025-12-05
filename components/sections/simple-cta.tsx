"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface SimpleCTAProps {
  title: string
  description: string
  ctaText: string
  ctaLink?: string
  className?: string
}

export function SimpleCTA({
  title,
  description,
  ctaText,
  ctaLink = "/studio/discover",
  className
}: SimpleCTAProps) {
  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      <div className="container mx-auto px-4">
        {/* Title Section - Centered */}
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-brand-gray-300 mb-8 max-w-2xl mx-auto">
            {description}
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white hover:opacity-90 transition-opacity"
            asChild
          >
            <Link href={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-pink-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}

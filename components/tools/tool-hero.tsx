"use client"

import { cn } from "@/lib/utils"
import { HeroConfig } from "@/lib/tools/tool-configs"

interface ToolHeroProps {
  config: HeroConfig & { slug: string }
  className?: string
}

export function ToolHero({ config, className }: ToolHeroProps) {
  const handleScrollToBuilder = () => {
    const el = document.getElementById(`${config.slug}-playground`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section
      className={cn(
        "relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden",
        "pt-28 pb-16",
        className
      )}
    >
      <div className="container mx-auto px-4 relative z-10">
      {/* Content */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-gradient-brand leading-tight mb-6">
          {config.h1}
        </h1>

        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {config.description}
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleScrollToBuilder}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-full hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            {config.ctaText}
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </section>
  )
}

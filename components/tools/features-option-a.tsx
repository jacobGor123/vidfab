"use client"

import { cn } from "@/lib/utils"

interface FeatureItem {
  title: string
  description: string
}

interface FeaturesOptionAProps {
  title: string
  features: FeatureItem[]
  className?: string
}

/**
 * Option A — Ghost Numbers
 * 超大半透明序号作为水印，卡片内容浮在上层，电影场记板质感
 */
export function FeaturesOptionA({ title, features, className }: FeaturesOptionAProps) {
  return (
    <section className={cn("py-24", className)}>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white text-center mb-16">
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const num = String(index + 1).padStart(2, "0")
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-500"
              >
                {/* Ghost number watermark */}
                <div
                  className="absolute -right-4 -top-6 font-heading font-extrabold leading-none select-none pointer-events-none transition-all duration-500 group-hover:-top-4"
                  style={{
                    fontSize: "clamp(6rem, 10vw, 9rem)",
                    color: "transparent",
                    WebkitTextStroke: "1px rgba(255,255,255,0.06)",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {num}
                </div>

                {/* Top accent line */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand-purple-DEFAULT/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="relative p-7 pt-8">
                  {/* Small number label */}
                  <span
                    className="inline-block text-xs font-mono font-semibold tracking-[0.2em] mb-5 px-2 py-0.5 rounded border"
                    style={{
                      color: "rgba(167,139,250,0.7)",
                      borderColor: "rgba(167,139,250,0.2)",
                      backgroundColor: "rgba(167,139,250,0.05)",
                    }}
                  >
                    {num}
                  </span>

                  <h3 className="text-lg font-heading font-bold text-white mb-3 leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom right corner glow on hover */}
                <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-brand-purple-DEFAULT/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

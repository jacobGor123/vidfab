"use client"

import { cn } from "@/lib/utils"

interface FeatureItem {
  title: string
  description: string
}

interface FeaturesOptionBProps {
  title: string
  features: FeatureItem[]
  className?: string
}

/**
 * Option B — Ruled Index
 * 无卡片，大序号 + 水平分隔线的杂志/编辑风排版
 * 2列 grid，每列3条，视觉层次靠数字和细线撑起
 */
export function FeaturesOptionB({ title, features, className }: FeaturesOptionBProps) {
  const half = Math.ceil(features.length / 2)
  const left = features.slice(0, half)
  const right = features.slice(half)

  return (
    <section className={cn("py-24", className)}>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white text-center mb-20">
          {title}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 mx-auto">
          {[left, right].map((col, colIdx) => (
            <div key={colIdx}>
              {col.map((feature, i) => {
                const globalIndex = colIdx * half + i
                const num = String(globalIndex + 1).padStart(2, "0")
                return (
                  <div
                    key={i}
                    className="py-8 border-t border-white/[0.08] cursor-default"
                  >
                    <div className="flex items-start gap-6">
                      {/* Large gradient number */}
                      <span
                        className="flex-shrink-0 font-heading font-extrabold leading-none mt-0.5"
                        style={{
                          fontSize: "2.5rem",
                          letterSpacing: "-0.04em",
                          background: "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(236,72,153,0.75) 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {num}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-heading font-bold text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="border-t border-white/[0.08]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

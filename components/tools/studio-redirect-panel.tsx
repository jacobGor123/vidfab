"use client"

import { ArrowRight } from "lucide-react"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { StudioRedirectPanelConfig } from "@/lib/tools/seo-tool-configs"

interface StudioRedirectPanelProps {
  slug: string
  config: StudioRedirectPanelConfig
  className?: string
}

function getMarqueeRows(videos: StudioRedirectPanelConfig["previewVideos"]) {
  const midpoint = Math.ceil(videos.length / 2)
  const firstRow = videos.slice(0, midpoint)
  const secondRow = videos.slice(midpoint)

  return [firstRow, secondRow.length > 0 ? secondRow : firstRow.slice().reverse()]
}

function MarqueeVideoCard({ video }: { video: StudioRedirectPanelConfig["previewVideos"][number] }) {
  return (
    <div className="tool-marquee-card">
      <div className="tool-marquee-card-media" data-aspect={video.aspect === "video" ? "video" : "portrait"}>
        <video
          src={video.url}
          poster={video.posterUrl}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          className="tool-marquee-video"
        />
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute left-2.5 top-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-xs text-gray-100">
          {video.label}
        </div>
      </div>
    </div>
  )
}

function MarqueeRow({
  videos,
  direction,
}: {
  videos: StudioRedirectPanelConfig["previewVideos"]
  direction: "left" | "right"
}) {
  return (
    <div className="tool-marquee-viewport">
      <div
        className={cn(
          "tool-marquee-track",
          direction === "left" ? "animate-tool-marquee-left" : "animate-tool-marquee-right"
        )}
      >
        {[0, 1].map((groupIndex) => (
          <div
            key={groupIndex}
            className="tool-marquee-group"
            aria-hidden={groupIndex === 1 ? "true" : undefined}
          >
            {videos.map((video, videoIndex) => (
              <MarqueeVideoCard key={`${video.url}-${groupIndex}-${videoIndex}`} video={video} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StudioRedirectPanel({ slug, config, className }: StudioRedirectPanelProps) {
  const [firstRow, secondRow] = getMarqueeRows(config.previewVideos)

  return (
    <section id={`${slug}-playground`} className={cn("overflow-hidden py-20 bg-brand-gray-900/30", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4">
            {config.title}
          </h2>
          {config.description && (
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              {config.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {config.steps.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple-DEFAULT/15 text-sm font-bold text-brand-purple-DEFAULT">
                  {index + 1}
                </div>
                {index < config.steps.length - 1 && (
                  <ArrowRight className="hidden h-5 w-5 text-gray-600 md:block" />
                )}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="-mx-4 mt-8 space-y-4 sm:-mx-6 lg:-mx-10">
          <MarqueeRow videos={firstRow} direction="left" />
          <MarqueeRow videos={secondRow} direction="right" />
        </div>

        <div className="mt-10 text-center">
          <Link
            href={config.ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT px-7 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            {config.ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

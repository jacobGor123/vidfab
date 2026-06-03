"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Play, Pause } from "lucide-react"
import { PromptExample } from "@/lib/tools/tool-configs"

interface PromptShowcaseProps {
  title: string
  subtitle: string
  prompts: PromptExample[]
  promptLabel?: string
  variant?: "standard" | "short-form" | "effect-examples" | "media-examples"
  className?: string
}

function PromptCard({ example, promptLabel }: { example: PromptExample; promptLabel: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = Boolean(example.videoUrl)
  const imageSrc = example.imageUrl || example.posterUrl
  const aspectClass =
    example.previewAspectRatio === "portrait"
      ? "aspect-[9/16]"
      : example.previewAspectRatio === "square"
      ? "aspect-square"
      : "aspect-video"

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  return (
    <div className="rounded-2xl border border-brand-gray-700 bg-brand-gray-900/60 overflow-hidden hover:border-brand-purple-DEFAULT/30 transition-all duration-300 group">
      {/* Video */}
      <div className={cn("relative bg-brand-gray-800 overflow-hidden", aspectClass)}>
        {hasVideo ? (
          <video
            ref={videoRef}
            src={example.videoUrl}
            poster={example.posterUrl}
            loop
            muted
            playsInline
            preload="metadata"
            onCanPlay={() => setIsLoaded(true)}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={example.category}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}

        {/* Play overlay */}
        {hasVideo && (
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-black/20 hover:bg-black/30 transition-colors duration-200",
              "group/btn"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-200 group-hover/btn:scale-110">
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </div>
          </button>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-black/60 backdrop-blur-sm text-gray-200 border border-white/10">
            {example.category}
          </span>
        </div>
      </div>

      {/* Prompt text */}
      <div className="p-4 space-y-2">
        <p className="text-xs text-brand-purple-DEFAULT uppercase tracking-wider font-medium">{promptLabel}</p>
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
          {example.prompt}
        </p>
      </div>
    </div>
  )
}

function EffectExampleCard({ example }: { example: PromptExample }) {
  const hasVideo = Boolean(example.videoUrl)
  const imageSrc = example.imageUrl || example.posterUrl
  const aspectClass =
    example.previewAspectRatio === "portrait"
      ? "aspect-[9/16]"
      : example.previewAspectRatio === "three-four"
      ? "aspect-[3/4]"
      : example.previewAspectRatio === "square"
      ? "aspect-square"
      : "aspect-video"

  return (
    <article className="group overflow-hidden rounded-lg border border-brand-gray-700 bg-brand-gray-900/60 transition-colors duration-300 hover:border-brand-purple-DEFAULT/35">
      <div className={cn("relative overflow-hidden bg-brand-gray-900", aspectClass)}>
        {hasVideo ? (
          <video
            src={example.videoUrl}
            poster={example.posterUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={example.category}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-sm font-semibold text-white drop-shadow sm:text-base">{example.category}</p>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-xs leading-relaxed text-gray-300 line-clamp-3 sm:text-sm">{example.prompt}</p>
      </div>
    </article>
  )
}

function ShortFormPromptCard({ example, index }: { example: PromptExample; index: number }) {
  const hasVideo = Boolean(example.videoUrl)
  const imageSrc = example.imageUrl || example.posterUrl

  return (
    <article className="group h-full overflow-hidden rounded-lg border border-brand-gray-700 bg-brand-gray-900/60 transition-colors duration-300 hover:border-brand-purple-DEFAULT/35">
      <div className="relative aspect-[9/16] overflow-hidden bg-brand-gray-900">
        {hasVideo ? (
          <video
            src={example.videoUrl}
            poster={example.posterUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={example.category}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />
        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-xs font-semibold text-gray-100">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[11px] font-medium text-gray-100 sm:px-3 sm:py-1.5 sm:text-xs">
            {example.category}
          </p>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-xs leading-relaxed text-gray-300 line-clamp-4 sm:text-sm sm:line-clamp-5">{example.prompt}</p>
      </div>
    </article>
  )
}

export function PromptShowcase({
  title,
  subtitle,
  prompts,
  promptLabel = "Prompt",
  variant = "standard",
  className,
}: PromptShowcaseProps) {
  const isShortForm = variant === "short-form"
  const isEffectExamples = variant === "effect-examples" || variant === "media-examples"

  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4">
            {title}
          </h2>
          {subtitle && <p className="text-gray-400 text-lg max-w-xl mx-auto">{subtitle}</p>}
        </div>

        <div
          className={cn(
            "grid mx-auto",
            isShortForm || isEffectExamples
              ? "grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
              : "grid-cols-1 gap-6 md:grid-cols-2"
          )}
        >
          {prompts.map((example, i) => (
            isShortForm ? (
              <ShortFormPromptCard key={i} example={example} index={i} />
            ) : isEffectExamples ? (
              <EffectExampleCard key={i} example={example} />
            ) : (
              <PromptCard key={i} example={example} promptLabel={promptLabel} />
            )
          ))}
        </div>
      </div>
    </section>
  )
}

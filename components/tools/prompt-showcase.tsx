"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Play, Pause } from "lucide-react"
import { PromptExample } from "@/lib/tools/tool-configs"

interface PromptShowcaseProps {
  title: string
  subtitle: string
  prompts: PromptExample[]
  className?: string
}

function PromptCard({ example }: { example: PromptExample }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
      <div className="relative aspect-video bg-brand-gray-800 overflow-hidden">
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

        {/* Play overlay */}
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

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-black/60 backdrop-blur-sm text-gray-200 border border-white/10">
            {example.category}
          </span>
        </div>
      </div>

      {/* Prompt text */}
      <div className="p-4 space-y-2">
        <p className="text-xs text-brand-purple-DEFAULT uppercase tracking-wider font-medium">Prompt</p>
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
          {example.prompt}
        </p>
      </div>
    </div>
  )
}

export function PromptShowcase({ title, subtitle, prompts, className }: PromptShowcaseProps) {
  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-purple-DEFAULT/5 rounded-full blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4">
            {title}
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto">
          {prompts.map((example, i) => (
            <PromptCard key={i} example={example} />
          ))}
        </div>
      </div>
    </section>
  )
}

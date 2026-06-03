import { ExternalLink, FileText, Link2, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StoryInputExample } from "@/lib/tools/seo-tool-configs"

interface StoryInputShowcaseProps {
  title: string
  subtitle: string
  examples: StoryInputExample[]
  className?: string
}

export function StoryInputShowcase({ title, subtitle, examples, className }: StoryInputShowcaseProps) {
  return (
    <section className={cn("py-20 relative overflow-hidden bg-black", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4">
            {title}
          </h2>
          {subtitle && <p className="text-gray-400 text-lg max-w-xl mx-auto">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {examples.map((example, index) => (
            <article
              key={example.externalUrl}
              className="overflow-hidden rounded-lg border border-brand-gray-700 bg-brand-gray-900/60"
            >
              <a
                href={example.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block bg-black"
                aria-label={`Open reference video: ${example.title}`}
              >
                <div className="relative aspect-video">
                  <img
                    src={example.imageUrl}
                    alt={example.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-gray-200 sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
                    YouTube Shorts reference
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                    <p className="mb-2 text-xs text-gray-400 sm:mb-3 sm:text-sm">Reference {String(index + 1).padStart(2, "0")}</p>
                    <h3 className="text-base font-semibold leading-tight text-white sm:text-xl">{example.title}</h3>
                  </div>
                </div>
              </a>

              <div className="p-4 sm:p-5 md:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
                  <a
                    href={example.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300 transition-colors hover:border-brand-purple-DEFAULT/50 hover:text-white sm:text-sm"
                  >
                    <Link2 className="h-4 w-4 text-brand-purple-DEFAULT" />
                    Use reference URL in Studio
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-gray-400 sm:inline-flex">
                    <FileText className="h-4 w-4 text-brand-purple-DEFAULT" />
                    Or paste the story input below
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/35 p-4 sm:p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-purple-DEFAULT sm:mb-3">
                    Story input
                  </p>
                  <p className="line-clamp-5 text-sm leading-relaxed text-gray-200 sm:text-base md:line-clamp-none">
                    {example.storyInput}
                  </p>
                </div>

                <div className="mt-5 sm:mt-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white sm:mb-4">
                    <ListChecks className="h-4 w-4 text-brand-purple-DEFAULT" />
                    Story structure Studio can split into shots
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {example.beats.map((beat) => (
                      <div key={beat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-2.5 sm:p-4">
                        <p className="text-xs font-semibold leading-tight text-white sm:mb-2 sm:text-sm">{beat.label}</p>
                        <p className="hidden text-sm leading-relaxed text-gray-500 sm:block">{beat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

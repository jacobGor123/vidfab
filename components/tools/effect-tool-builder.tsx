"use client"

import { useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { Upload, X, Sparkles, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoContext } from "@/lib/contexts/video-context"
import { BuilderResult } from "@/components/tools/tool-builder/builder-result"
import type { EffectBuilderConfig } from "@/lib/tools/seo-tool-configs"
import type { UserVideo } from "@/lib/supabase"

interface EffectToolBuilderProps {
  slug: string
  config: EffectBuilderConfig
  className?: string
}

function isEffectVideo(video: UserVideo): boolean {
  const withEffect = video as UserVideo & {
    effectId?: string | null
    settings?: { effectId?: string | null; generationType?: string | null } | null
  }

  return Boolean(
    withEffect.effectId ||
      withEffect.settings?.effectId ||
      withEffect.settings?.generationType === "video-effects"
  )
}

export function EffectToolBuilder({ slug, config, className }: EffectToolBuilderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const isAuthenticated = Boolean(session?.user)
  const videoContext = useVideoContext()
  const { startPolling } = useVideoPollingV2({ enabled: true })

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedEffectId, setSelectedEffectId] = useState(config.defaultEffectId)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const selectedEffect =
    config.effects.find((effect) => effect.id === selectedEffectId) ?? config.effects[0]

  const currentJob = currentJobId
    ? videoContext.activeJobs.find((job) => job.id === currentJobId) ??
      videoContext.failedJobs.find((job) => job.id === currentJobId) ??
      null
    : null

  const generation = useVideoGeneration({
    onSuccess: (job) => {
      setCurrentJobId(job.id)
      startPolling(job)
    },
    onError: (message) => setError(message),
    onAuthRequired: () => setIsAuthOpen(true),
  })

  const completedEffectVideos = videoContext.completedVideos.filter(isEffectVideo)
  const isJobActive =
    generation.isGenerating ||
    Boolean(currentJob && !["completed", "failed"].includes(currentJob.status))

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAuthenticated) {
      setIsAuthOpen(true)
      event.target.value = ""
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || data.message || "Image upload failed.")
      }

      const uploadedUrl = data.url || data.data?.url
      if (!uploadedUrl) {
        throw new Error("Upload response is missing the image URL.")
      }

      setImageUrl(uploadedUrl)
    } catch (uploadError) {
      setImageUrl(null)
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true)
      return
    }
    if (!imageUrl) {
      setError("Upload a clear image before generating the effect.")
      return
    }
    if (!selectedEffect) {
      setError("Select an effect before generating.")
      return
    }

    setError(null)

    try {
      const jobId = await generation.generateVideoEffects({
        image: imageUrl,
        effectId: selectedEffect.id,
        effectName: selectedEffect.name,
      })
      setCurrentJobId(jobId)
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generation failed.")
    }
  }

  return (
    <section id={`${slug}-playground`} className={cn("py-16 relative", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-white mb-3">
            {config.title}
          </h2>
          <p className="text-gray-400 text-lg">{config.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6 max-w-5xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-200 text-xs ml-4 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto rounded-2xl border border-brand-gray-700 bg-brand-gray-900/80 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-[400px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-brand-gray-700 p-6">
              <div className="flex flex-col gap-5 h-full">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400 uppercase tracking-wider">
                    {config.uploadLabel}
                  </Label>

                  {isUploading ? (
                    <div className="w-full h-28 rounded-lg border-2 border-dashed border-brand-purple-DEFAULT/40 bg-brand-purple-DEFAULT/5 flex flex-col items-center justify-center gap-2.5">
                      <div className="w-32 h-1 rounded-full bg-brand-gray-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT rounded-full animate-[upload-progress_1.2s_ease-in-out_infinite]" />
                      </div>
                      <span className="text-xs text-brand-purple-DEFAULT animate-pulse">
                        Uploading...
                      </span>
                    </div>
                  ) : imageUrl ? (
                    <div className="relative w-full h-44 rounded-lg overflow-hidden border border-brand-gray-700 bg-brand-gray-900">
                      <img src={imageUrl} alt="Uploaded reference" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                        aria-label="Remove uploaded image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 rounded-lg border-2 border-dashed border-brand-gray-700 hover:border-brand-purple-DEFAULT/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-200"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-sm">Click to upload image</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400 uppercase tracking-wider">
                    {config.effectLabel}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {config.effects.map((effect) => {
                      const isSelected = effect.id === selectedEffect.id
                      return (
                        <button
                          key={effect.id}
                          type="button"
                          onClick={() => setSelectedEffectId(effect.id)}
                          className={cn(
                            "relative overflow-hidden rounded-lg border bg-brand-gray-800 text-left transition-all",
                            isSelected
                              ? "border-brand-purple-DEFAULT ring-1 ring-brand-purple-DEFAULT"
                              : "border-brand-gray-700 hover:border-brand-gray-500"
                          )}
                        >
                          <div className="h-32 bg-brand-gray-900">
                            <img
                              src={effect.posterUrl}
                              alt={effect.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-white truncate">{effect.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-purple-DEFAULT flex-shrink-0" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isUploading || isJobActive || (!isAuthenticated ? false : !imageUrl)}
                  className="w-full py-5 text-base font-semibold bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white hover:opacity-90 transition-opacity rounded-xl mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJobActive ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {config.ctaText}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1 min-w-0 overflow-hidden p-6">
              <BuilderResult
                currentJob={currentJob}
                completedVideos={completedEffectVideos}
                onLoadHistory={() => videoContext.loadCompletedVideos?.()}
                demoVideos={config.demoVideos}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="p-0 max-w-[800px] bg-[#0e1018] border-white/10 overflow-hidden rounded-[20px]">
          <DialogTitle className="sr-only">Sign in to VidFab</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>
    </section>
  )
}

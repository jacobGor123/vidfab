"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { BuilderForm } from "./builder-form"
import { BuilderResult } from "./builder-result"
import { useToolBuilder } from "./use-tool-builder"
import { useVideoContext } from "@/lib/contexts/video-context"
import { ToolPageConfig } from "@/lib/tools/tool-configs"

interface ToolBuilderProps {
  config: ToolPageConfig
  className?: string
}

export function ToolBuilder({ config, className }: ToolBuilderProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const videoContext = useVideoContext()

  const { state, setParam, submit, clearError, currentJob, credits, isAuthenticated, isJobActive } =
    useToolBuilder(config.builder)

  return (
    <section id={`${config.slug}-playground`} className={cn("py-16 relative", className)}>
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-white mb-3">
            {config.builderTitle}
          </h2>
          <p className="text-gray-400 text-lg">{config.builderSubtitle}</p>
        </div>

        {/* Error banner */}
        {state.error && (
          <div className="mb-6 max-w-5xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{state.error}</p>
              <button
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-red-200 text-xs ml-4 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Builder panel */}
        <div className="mx-auto rounded-2xl border border-brand-gray-700 bg-brand-gray-900/80 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Form */}
            <div className="w-full lg:w-[380px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-brand-gray-700 p-6">
              <BuilderForm
                config={config.builder}
                state={state}
                onParamChange={setParam}
                onSubmit={submit}
                onShowAuth={() => setIsAuthOpen(true)}
                isAuthenticated={isAuthenticated}
                credits={credits}
                isJobActive={isJobActive}
              />
            </div>

            {/* Right: Result + History */}
            <div className="flex-1 min-w-0 overflow-hidden p-6">
              <BuilderResult
                currentJob={currentJob}
                completedVideos={videoContext.completedVideos ?? []}
                onLoadHistory={() => videoContext.loadCompletedVideos?.()}
                demoVideos={config.builder.demoVideos}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="p-0 max-w-[800px] bg-[#0e1018] border-white/10 overflow-hidden rounded-[20px]">
          <DialogTitle className="sr-only">Sign in to VidFab</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>
    </section>
  )
}

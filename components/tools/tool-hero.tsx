"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HeroConfig } from "@/lib/tools/tool-configs"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"

interface ToolHeroProps {
  config: HeroConfig & { slug: string }
  className?: string
}


export function ToolHero({ config, className }: ToolHeroProps) {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  const playgroundId = `${config.slug}-playground`
  const authCallbackUrl =
    typeof window !== "undefined" ? `${window.location.pathname}#${playgroundId}` : undefined

  const handleCtaClick = () => {
    if (isAuthenticated) {
      const el = document.getElementById(playgroundId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      setIsAuthOpen(true)
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
      {/* ── 渐变底色 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 140% 120% at 50% -5%, rgba(124,58,237,0.55) 0%, transparent 65%)",
            "linear-gradient(to bottom, #160a36 0%, #0a0520 45%, #04020f 100%)",
          ].join(", "),
        }}
      />

      {/* ── 网格线（只在上半部渐隐） ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── 内容 ── */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-gradient-brand leading-tight mb-6">
            {config.h1}
          </h1>

          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {config.description}
          </p>

          <div className="flex justify-center">
            <button
              onClick={handleCtaClick}
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

      {/* Auth modal（未登录时弹出，登录成功后跳回当前页并滚动到 playground） */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="p-0 max-w-md">
          <DialogTitle className="sr-only">Sign in to VidFab</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" callbackUrl={authCallbackUrl} />
        </DialogContent>
      </Dialog>
    </section>
  )
}

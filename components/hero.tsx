"use client"

import type React from "react"
import { VideoHeroContainer } from "./video-hero/video-hero-container"

interface HeroProps {
  onQuerySubmit: (query: string) => void
}

export function Hero({ onQuerySubmit }: HeroProps) {
  return (
    <VideoHeroContainer
      onQuerySubmit={onQuerySubmit}
      className="w-full h-full"
    />
  )
}

"use client"

import { CommunityCTA } from '@/components/sections/community-cta'

interface CommunityVideo {
  url: string
  alt: string
}

// 黑五专属视频 - 使用首页相同的视频但完全打乱顺序，确保视觉效果不同
const blackFridayVideos: CommunityVideo[] = [
  { url: "https://static.vidfab.ai/discover-new/discover-new-09.mp4", alt: "Discover Video 12" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-03.mp4", alt: "Discover Video 4" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-14.mp4", alt: "Discover Video 13" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-06.mp4", alt: "Discover Video 7" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-11.mp4", alt: "Discover Video 14" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-01.mp4", alt: "Discover Video 1" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-08.mp4", alt: "Discover Video 10" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-12.mp4", alt: "Discover Video 9" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-04.mp4", alt: "Discover Video 5" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-13.mp4", alt: "Discover Video 11" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-07.mp4", alt: "Discover Video 8" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-02.mp4", alt: "Discover Video 2" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-10.mp4", alt: "Discover Video 3" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-05.mp4", alt: "Discover Video 6" },
]

export function BlackFridayShowcaseWrapper() {
  return (
    <CommunityCTA
      title="Create Your Own Masterpiece with VidFab AI Now!"
      subtitle="Trusted by 10,000+ creators worldwide"
      description=""
      ctaText="Generate Your First Video for Free"
      getInspiredText="Get Inspired"
      videos={blackFridayVideos}
    />
  )
}

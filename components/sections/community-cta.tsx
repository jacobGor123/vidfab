"use client"

import { ArrowRight, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState, useRef, MouseEvent } from "react"

interface CommunityVideo {
  url: string
  alt: string
}

interface CommunityCTAProps {
  title: string
  subtitle: string
  description: string
  ctaText: string
  getInspiredText: string
  videos?: CommunityVideo[]
  className?: string
}

const defaultVideos: CommunityVideo[] = [
  { url: "https://static.vidfab.ai/discover-new/discover-new-01.mp4", alt: "Discover Video 1" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-02.mp4", alt: "Discover Video 2" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-10.mp4", alt: "Discover Video 3" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-03.mp4", alt: "Discover Video 4" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-04.mp4", alt: "Discover Video 5" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-05.mp4", alt: "Discover Video 6" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-06.mp4", alt: "Discover Video 7" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-07.mp4", alt: "Discover Video 8" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-12.mp4", alt: "Discover Video 9" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-08.mp4", alt: "Discover Video 10" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-13.mp4", alt: "Discover Video 11" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-09.mp4", alt: "Discover Video 12" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-14.mp4", alt: "Discover Video 13" },
  { url: "https://static.vidfab.ai/discover-new/discover-new-11.mp4", alt: "Discover Video 14" }
]

function VideoItem({ video, rowIndex, index }: { video: CommunityVideo; rowIndex: number; index: number }) {
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleToggleMute = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (videoRef.current) {
      const newMutedState = !isMuted
      videoRef.current.muted = newMutedState
      setIsMuted(newMutedState)
    }
  }

  const handleMouseLeave = () => {
    // 鼠标移出时重置为静音
    if (videoRef.current && !isMuted) {
      videoRef.current.muted = true
      setIsMuted(true)
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl flex-shrink-0 relative",
        "bg-brand-gray-800/50 border border-brand-gray-700",
        "group cursor-pointer transition-all duration-300",
        "hover:scale-105 hover:z-10 hover:shadow-2xl"
      )}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={video.url}
        className="h-[300px] w-auto block transition-transform duration-500 group-hover:scale-110"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Audio Toggle Button */}
      <button
        type="button"
        onClick={handleToggleMute}
        className={cn(
          "absolute bottom-3 right-3 p-2.5 rounded-full z-20",
          "bg-black/70 hover:bg-black/90 backdrop-blur-sm",
          "transition-all duration-200 border border-white/20",
          "opacity-100 md:opacity-0 md:group-hover:opacity-100"
        )}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  )
}

export function CommunityCTA({
  title,
  subtitle,
  description,
  ctaText,
  getInspiredText,
  videos = defaultVideos,
  className
}: CommunityCTAProps) {
  // 将视频分成 2 行（瀑布流布局）
  const rows = 2
  const videosPerRow = Math.ceil(videos.length / rows)
  const videoRows = Array.from({ length: rows }, (_, i) =>
    videos.slice(i * videosPerRow, (i + 1) * videosPerRow)
  )

  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      <div className="container mx-auto px-4">
        {/* Title Section - Centered */}
        <div className="text-center mb-12 max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
            {title}
          </h2>
          <Button
            size="lg"
            className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white hover:opacity-90 transition-opacity"
            asChild
          >
            <Link href="/create">
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Scrolling Video Gallery - 瀑布流布局 */}
        <div className="relative -mx-4 overflow-hidden">
          <div className="flex flex-col gap-4 py-4">
            {videoRows.map((rowVideos, rowIndex) => (
              <div
                key={rowIndex}
                className="relative overflow-hidden"
              >
                <div
                  className={cn(
                    "flex gap-4 items-center animate-scroll-row",
                    rowIndex % 2 === 0 ? "animate-scroll-left" : "animate-scroll-right"
                  )}
                  style={{
                    animationDuration: `${25 + rowIndex * 5}s`,
                  }}
                >
                  {/* 三倍渲染实现无缝循环 */}
                  {[...rowVideos, ...rowVideos, ...rowVideos].map((video, index) => (
                    <VideoItem
                      key={`${rowIndex}-${index}`}
                      video={video}
                      rowIndex={rowIndex}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 渐变遮罩 */}
          <div className="absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />
          <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-pink-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right linear infinite;
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
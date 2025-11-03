"use client"

import { ArrowRight, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getVideoPoster } from "@/lib/utils/video-poster"
import Link from "next/link"
import { useState, useRef, MouseEvent, useEffect } from "react"

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
  showVideos?: boolean
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

function VideoItem({ video, rowIndex, index, isMobile }: { video: CommunityVideo; rowIndex: number; index: number; isMobile: boolean }) {
  const [isMuted, setIsMuted] = useState(true)
  const [isReady, setIsReady] = useState(false)
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

  // 只在视频真正能播放时才开始播放
  const handleCanPlay = () => {
    setIsReady(true)
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        // 静默处理自动播放失败 (某些浏览器可能阻止自动播放)
        console.debug('Video autoplay prevented:', err)
      })
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
        poster={getVideoPoster(video.url, { useLocal: true })}
        className={cn(
          "w-auto block transition-transform duration-500 group-hover:scale-110",
          isMobile ? "h-[200px] max-w-[280px]" : "h-[300px]"
        )}
        loop
        muted
        playsInline
        preload="metadata"
        onCanPlay={handleCanPlay}
      />

      {/* Audio Toggle Button */}
      <button
        type="button"
        onClick={handleToggleMute}
        className={cn(
          "absolute bottom-3 right-3 p-3 rounded-full z-20",
          "min-w-[44px] min-h-[44px] flex items-center justify-center",
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
  className,
  showVideos = true
}: CommunityCTAProps) {
  // 移动端检测
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const userAgent = navigator.userAgent
      const isMobileByWidth = width < 768 // md breakpoint
      const isMobileByUserAgent = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)
      return isMobileByWidth || isMobileByUserAgent
    }

    setIsMobile(checkMobile())

    const handleResize = () => {
      setIsMobile(checkMobile())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 移动端优化：减少视频数量和行数
  const mobileVideos = videos.slice(0, 8) // 移动端只显示 8 个视频
  const displayVideos = isMobile ? mobileVideos : videos

  // 将视频分成 2 行（瀑布流布局）
  const rows = 2
  const videosPerRow = Math.ceil(displayVideos.length / rows)
  const videoRows = Array.from({ length: rows }, (_, i) =>
    displayVideos.slice(i * videosPerRow, (i + 1) * videosPerRow)
  )

  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      <div className="container mx-auto px-4">
        {/* Title Section - Centered */}
        <div className="text-center mb-12 max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl md:text-2xl font-medium mb-4 text-gray-200">
              {subtitle}
            </p>
          )}
          {description && (
            <p className="text-base md:text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              {description}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
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
            {getInspiredText && (
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-brand-purple-DEFAULT text-brand-purple-DEFAULT hover:bg-brand-purple-DEFAULT hover:text-white transition-all"
                asChild
              >
                <Link href="/discover">
                  {getInspiredText}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Scrolling Video Gallery - 瀑布流布局 */}
        {showVideos && (
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
                    {/* 移动端两倍渲染，桌面端三倍渲染实现无缝循环 */}
                    {(isMobile
                      ? [...rowVideos, ...rowVideos]
                      : [...rowVideos, ...rowVideos, ...rowVideos]
                    ).map((video, index) => (
                      <VideoItem
                        key={`${rowIndex}-${index}`}
                        video={video}
                        rowIndex={rowIndex}
                        index={index}
                        isMobile={isMobile}
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
        )}
      </div>

      {/* Background Decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-pink-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scroll-left-desktop {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-right-desktop {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes scroll-left-mobile {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-right-mobile {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        @media (min-width: 768px) {
          .animate-scroll-left {
            animation: scroll-left-desktop linear infinite;
          }

          .animate-scroll-right {
            animation: scroll-right-desktop linear infinite;
          }
        }

        @media (max-width: 767px) {
          .animate-scroll-left {
            animation: scroll-left-mobile linear infinite;
          }

          .animate-scroll-right {
            animation: scroll-right-mobile linear infinite;
          }
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
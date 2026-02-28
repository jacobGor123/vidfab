"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

const STEPS = [
  {
    id: "01",
    title: "Identity Lock",
    description:
      "Define your cast once. VidFab keeps your characters consistent in every frame, ensuring your audience never loses the plot.",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/workspace-step-identity-lock.webp",
  },
  {
    id: "02",
    title: "AI Directing",
    description:
      "Automatically convert scripts into shot-by-shot storyboards. Visualize composition and camera angles before you generate.",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/workspace-step-ai-directing.webp",
  },
  {
    id: "03",
    title: "Shot Previews",
    description:
      "Transform storyboards into instant motion-previews. Check the pacing in real-time and fine-tune any shot until the rhythm hits perfectly.",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/workspace-step-shot-previews.webp",
  },
  {
    id: "04",
    title: "Final Assembly",
    description:
      "Combine all your scenes into a polished video. Download your masterpiece in seconds, perfectly formatted for TikTok, Reels, or Shorts.",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/workspace-step-final-assembly.webp",
  },
]

const INTERVAL_MS = 4000

export function WorkspaceSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setActive((p) => (p + 1) % STEPS.length), INTERVAL_MS)
    return () => clearInterval(t)
  }, [paused])

  return (
    <section
      className="relative overflow-hidden rounded-t-[40px] sm:rounded-t-[80px] lg:rounded-t-[150px]"
      style={{
        backgroundColor: "#000000",
        marginTop: 0,
        paddingTop: 64,
        paddingBottom: 64,
        zIndex: 10,
        position: "relative",
      }}
    >
      {/* 背景网格线 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "60px 60px",
        }}
      />

      {/* 渐变光晕层：顶部紫色线性淡出 + 左蓝右紫椭圆，全部用多层 CSS gradient 避免 overflow 裁切 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "linear-gradient(to bottom, rgba(160,104,255,0.40) 0%, transparent 45%)",
            "radial-gradient(ellipse 63% 80% at 35% 0%, rgba(51,83,212,0.28) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 80% at 68% 0%, rgba(123,52,200,0.28) 0%, transparent 65%)",
          ].join(", "),
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* 区块标题 */}
        <h2
          className="font-bold text-center text-white mb-5 mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3 }}
        >
          A Visual Workspace Built for Batch Production
        </h2>

        {/* 副标题 */}
        <p
          className="text-center font-normal mb-16 mx-auto"
          style={{ fontSize: 16, lineHeight: 1.8, color: "rgb(235,238,252)", maxWidth: 680 }}
        >
          Don&apos;t just make a video—build a series. Master our seamless interface designed
          for high-volume content creation.
        </p>

        {/* 双列布局：左 2/5，右 3/5 */}
        <div
          className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* 左：步骤列表（2/5） */}
          <div className="md:col-span-2">
            {STEPS.map((step, i) => (
              <div key={step.id}>
                <button className="w-full text-left" onClick={() => setActive(i)}>
                  <div
                    className="flex gap-5 items-start py-6 px-4"
                    style={{
                      backgroundColor: active === i ? "rgba(255,255,255,0.06)" : "transparent",
                      borderRadius: 12,
                      transition: "background-color 0.3s",
                    }}
                  >
                    {/* 步骤编号 */}
                    <span
                      className="font-bold flex-shrink-0 text-[32px] md:text-[46px]"
                      style={{
                        lineHeight: 1,
                        color: active === i ? "#AEB2F0" : "rgba(174,178,240,0.3)",
                        transition: "color 0.3s",
                        minWidth: 68,
                      }}
                    >
                      {step.id}
                    </span>

                    {/* 文案 */}
                    <div>
                      <h3
                        className="font-semibold mb-2"
                        style={{
                          fontSize: 20,
                          color: active === i ? "#ffffff" : "rgba(255,255,255,0.4)",
                          transition: "color 0.3s",
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: "23.8px",
                          color: active === i ? "rgb(235,238,252)" : "rgba(235,238,252,0.3)",
                          transition: "color 0.3s",
                        }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>

                {/* 分隔线 */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      margin: "0 4px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 右：截图轮播（3/5） */}
          <div
            className="md:col-span-3 relative"
            style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "645 / 410" }}
          >
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: active === i ? 1 : 0 }}
              >
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

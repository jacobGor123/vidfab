"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"

// 来自 Figma 设计稿：
// 卡片 bg: #161640，左侧紫色竖条边框 #5C46DA
// 照片：parallelogram clip-path（右边斜切）
// 渐变遮罩：transparent → rgba(92,70,218) → #161640
// 分页点：27×3px，#8C89B2，active 拉宽 44px 变白
// 箭头：Polygon 28×28 #5C46DA，位于卡片右外侧

const TESTIMONIALS = [
  {
    id: "alex",
    quote:
      '"From 20 hours of editing to 20 minutes of \'VidFabbing\'. The character consistency is a total game-changer for my YouTube Shorts."',
    author: "Alex R.",
    role: "YouTube Creator",
    photo: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/testimonial-alex.webp",
  },
  {
    id: "sarah",
    quote:
      '"Finally, a tool that understands the rhythm of social media. I\'ve grown 40k followers in two months."',
    author: "Sarah T.",
    role: "Content Strategist",
    photo: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/testimonial-sarah.webp",
  },
]

const INTERVAL_MS = 5000

export function CreatorTestimonialsSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(
      () => setActive((p) => (p + 1) % TESTIMONIALS.length),
      INTERVAL_MS
    )
    return () => clearInterval(t)
  }, [paused])

  const prev = () =>
    setActive((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setActive((p) => (p + 1) % TESTIMONIALS.length)

  const current = TESTIMONIALS[active]

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0A0A12", paddingTop: 64, paddingBottom: 64 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 背景色球 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 80% at 10% 50%, rgba(123,51,199,0.28) 0%, transparent 65%)",
            "radial-gradient(ellipse 55% 70% at 90% 50%, rgba(50,83,212,0.22) 0%, transparent 65%)",
          ].join(", "),
        }}
      />

      {/* 底部渐变过渡：向 CTA section (#000000) 柔和衔接 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: 200,
          background: "linear-gradient(to bottom, transparent 0%, #000000 100%)",
        }}
      />

      {/* 标题 */}
      <div className="container mx-auto px-4 relative z-10 mb-10">
        <h2
          className="font-bold text-center text-white mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3 }}
        >
          Join 10,000+ Creators Scaling with VidFab
        </h2>
      </div>

      {/* 卡片区：留出右侧空间放箭头 */}
      <div
        className="relative z-10 mx-auto"
        style={{ maxWidth: 1280, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* ── 主卡片：flex 布局，photo 作为 flex child 保证高度；用 mask-image 实现斜切 ── */}
        <div
          className="flex relative"
          style={{
            backgroundColor: "#161640",
            borderRadius: 10,
            borderLeft: "4px solid #5C46DA",
            minHeight: 234,
          }}
        >
          {/* 照片：Next.js Image，position:relative 容器 fill 模式 */}
          <div
            className="hidden md:block relative flex-shrink-0 overflow-hidden"
            style={{
              width: "44%",
              alignSelf: "stretch",
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
            }}
          >
            <Image
              src={current.photo}
              alt={current.author}
              fill
              sizes="(max-width: 768px) 0px, 44vw"
              style={{ objectFit: "cover", objectPosition: "center top" }}
              unoptimized
            />
          </div>

          {/* 分页点：卡片内底部横向居中 */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-20">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Testimonial ${i + 1}`}
                style={{
                  width: active === i ? 44 : 27,
                  height: 3,
                  borderRadius: 18,
                  backgroundColor: active === i ? "#ffffff" : "#8C89B2",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>

          {/* 文字区：flex:1 占满剩余宽度 */}
          <div
            className="relative z-10 flex flex-col justify-center px-4 sm:px-12 pt-9 pb-14 pl-6"
            style={{
              flex: 1,
              minHeight: 234,
            }}
          >
            {/* 装饰大引号（右上角，#5C46DA 半透明） */}
            <div
              aria-hidden="true"
              className="absolute top-4 right-6 select-none pointer-events-none"
              style={{
                fontSize: 140,
                lineHeight: 1,
                color: "rgba(92,70,218,0.35)",
                fontFamily: "Georgia, serif",
              }}
            >
              &rdquo;
            </div>

            {/* 引用内容（16px，lh=27.2px） */}
            <blockquote
              className="text-white font-normal"
              style={{ fontSize: 16, lineHeight: "27.2px" }}
            >
              {current.quote}
            </blockquote>

            {/* 作者（斜体加粗） */}
            <p
              className="mt-4"
              style={{ fontSize: 16, fontWeight: 700, fontStyle: "italic", color: "#ffffff" }}
            >
              — {current.author}, {current.role}
            </p>
          </div>
        </div>

        {/* ── 导航箭头：卡片下方，紧靠在一起（来自 Figma Polygon y=17174，水平并排） ── */}
        <div className="flex items-center gap-2 mt-5 justify-end">
          {/* 左箭头 */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="group"
            style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
          >
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
              <polygon
                points="20,4 8,14 20,24"
                fill="#4B3EA8"
                className="group-hover:fill-[#5C46DA] transition-colors duration-200"
              />
            </svg>
          </button>

          {/* 右箭头 */}
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="group"
            style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
          >
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
              <polygon
                points="8,4 20,14 8,24"
                fill="#4B3EA8"
                className="group-hover:fill-[#5C46DA] transition-colors duration-200"
              />
            </svg>
          </button>
        </div>

      </div>
    </section>
  )
}

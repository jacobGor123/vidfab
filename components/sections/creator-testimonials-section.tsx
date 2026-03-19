"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

// 照片 URL（非翻译内容，保留在代码中）
const TESTIMONIAL_META = [
  {
    id: "alex",
    photo: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/testimonial-alex-r.webp",
  },
  {
    id: "sarah",
    photo: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/testimonial-sarah-t.webp",
  },
]

const INTERVAL_MS = 5000

export function CreatorTestimonialsSection() {
  const t = useTranslations('home')
  const items = t.raw('testimonials.items') as Array<{
    quote: string; author: string; role: string
  }>

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(
      () => setActive((p) => (p + 1) % items.length),
      INTERVAL_MS
    )
    return () => clearInterval(timer)
  }, [paused, items.length])

  const prev = () =>
    setActive((p) => (p - 1 + items.length) % items.length)
  const next = () => setActive((p) => (p + 1) % items.length)

  const current = items[active]
  const currentMeta = TESTIMONIAL_META[active]

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

      {/* 底部渐变过渡 */}
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
          {t('testimonials.title')}
        </h2>
      </div>

      {/* 卡片区 */}
      <div
        className="relative z-10 mx-auto"
        style={{ maxWidth: 1280, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* 主卡片 */}
        <div
          className="flex relative"
          style={{
            backgroundColor: "#161640",
            borderRadius: 10,
            borderLeft: "4px solid #5C46DA",
            minHeight: 234,
          }}
        >
          {/* 照片 */}
          <div
            className="hidden md:block flex-shrink-0 overflow-hidden"
            style={{
              alignSelf: "stretch",
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
              maxWidth: "55%",
            }}
          >
            <img
              src={currentMeta.photo}
              alt={`${current.author}, ${current.role} — VidFab creator`}
              style={{ height: "100%", width: "auto", display: "block" }}
            />
          </div>

          {/* 分页点 */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-20">
            {items.map((_, i) => (
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

          {/* 文字区 */}
          <div
            className="relative z-10 flex flex-col justify-center px-4 sm:px-12 pt-9 pb-14 pl-6"
            style={{
              flex: 1,
              minHeight: 234,
            }}
          >
            {/* 装饰大引号 */}
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

            {/* 引用内容 */}
            <blockquote
              className="text-white font-normal"
              style={{ fontSize: 16, lineHeight: "27.2px" }}
            >
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* 作者 */}
            <p
              className="mt-4"
              style={{ fontSize: 16, fontWeight: 700, fontStyle: "italic", color: "#ffffff" }}
            >
              — {current.author}, {current.role}
            </p>
          </div>
        </div>

        {/* 导航箭头 */}
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

import Image from "next/image"
import Link from "next/link"

// 卡片背景 #0D0930，border rgb(92,95,130) — 均来自 Figma
const CARD_BG = "#0D0930"
const CARD_BORDER = "rgb(92,95,130)"

const CARDS = [
  {
    id: "outliner",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/script-card-outliner.webp",
    alt: "Outliner feature preview",
    title: 'The Outliner – "I have an outline"',
    description:
      "Paste your rough ideas or a basic plot. Our AI structures them into high-stakes scripts with a strong hook, tight pacing, and a viral payoff.",
  },
  {
    id: "curator",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/script-card-curator.webp",
    alt: "Curator feature preview",
    title: 'The Curator – "I have a reference video"',
    description:
      "Drop a link from YouTube Shorts. VidFab deconstructs the successful rhythm and generates an original script with a proven viral flow in your unique voice.",
  },
  {
    id: "spark",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/script-card-spark.webp",
    alt: "Spark feature preview",
    title: 'The Spark – "I need a fresh idea"',
    description:
      "Let VidFab's brainstormer pitch you 5 episodic concepts based on your niche. Pick the best one and expand it into a full script instantly.",
  },
]

export function ScriptSection() {
  return (
    <section
      className="relative px-4 pt-16 pb-16"
      style={{ backgroundColor: "#0A0A12" }}
    >
      {/* 背景渐变色球 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 100% at 10% 35%, rgba(123,52,200,0.52) 0%, transparent 65%)",
            "radial-gradient(ellipse 52% 90% at 90% 60%, rgba(51,83,212,0.48) 0%, transparent 65%)",
          ].join(", "),
        }}
      />

      {/* 底部渐变遮罩：向下过渡到 WorkspaceSection 的 #000000 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: 160,
          background: "linear-gradient(to bottom, transparent 0%, #000000 100%)",
        }}
      />

      {/* 顶部柔化遮罩：消除与上方 section 的硬边界 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 120,
          background: "linear-gradient(to bottom, #0A0A12 0%, transparent 100%)",
        }}
      />

      <div className="container mx-auto relative z-10">
        {/* 区块标题 */}
        <h2
          className="font-bold text-center text-white mb-4 mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3 }}
        >
          From Any Spark to a Ready-to-Shoot Script
        </h2>

        {/* 副标题 */}
        <p
          className="text-center font-normal mb-12 mx-auto"
          style={{ fontSize: 16, lineHeight: 1.8, color: "rgb(236,238,253)", maxWidth: 758 }}
        >
          Our workflow meets you where you are. Whether you&apos;re staring at a blank page or a
          viral reference, VidFab automates the heavy lifting.
        </p>

        {/* 3 列卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {CARDS.map((card) => (
            <div
              key={card.id}
              className="transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
              style={{ borderRadius: 16 }}
            >
            <div
              style={{
                backgroundColor: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: 16,
                overflow: "hidden",
                minHeight: 420,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* ① HTML 文案区（真实文字，可索引） */}
              <div style={{ padding: "27px 21px 0", flexShrink: 0 }}>
                <h3
                  className="text-white font-semibold mb-3"
                  style={{ fontSize: 20, lineHeight: 1.3 }}
                >
                  {card.title}
                </h3>
                <p
                  className="font-normal"
                  style={{ fontSize: 16, lineHeight: 1.65, color: "rgb(236,238,253)" }}
                >
                  {card.description}
                </p>
              </div>

              {/* ② UI 截图区：仅展示卡片 PNG 的底部截图部分
                  通过 object-fit:cover + object-position:bottom 自动裁掉顶部文字区域 */}
              <div style={{ flex: 1, position: "relative", marginTop: 16, minHeight: 200 }}>
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: "cover", objectPosition: "bottom center" }}
                  unoptimized
                />
              </div>
            </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <Link
            href="/studio/video-agent-beta"
            className="inline-flex items-center text-white transition-opacity hover:opacity-90"
            style={{
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 100,
              padding: "18px 40px",
              background: "linear-gradient(90deg, rgb(76,195,255) 0%, rgb(123,92,255) 100%)",
              boxShadow: "0 8px 34px rgba(115,108,255,0.4)",
            }}
          >
            Try Script Generation →
          </Link>
        </div>
      </div>
    </section>
  )
}

import Link from "next/link"

export function CTASection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#000000", paddingTop: 64, paddingBottom: 80 }}
    >
      {/* 网格背景：提高线条透明度使其更清晰 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "44px 44px",
        }}
      />

      {/* 紫色辉光：从底部中心向上扩散（Figma 实测：底部中心 #4B3892，中心 #16143C，顶角纯黑） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 200% at 50% 100%, rgba(75,56,146,1) 0%, rgba(55,45,150,0.4) 50%, transparent 70%)",
        }}
      />

      {/* 顶部渐变过渡：与上方 EngineeredSection #0A0A12 无缝衔接 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 120,
          background: "linear-gradient(to bottom, #0A0A12 0%, transparent 100%)",
        }}
      />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h2
          className="font-bold text-white text-[28px] sm:text-[38px] lg:text-[48px]"
          style={{ lineHeight: 1.25 }}
        >
          Ready to launch your first viral AI series?
        </h2>

        <p
          className="mt-4"
          style={{ fontSize: 16, lineHeight: "27.2px", color: "rgba(255,255,255,0.7)" }}
        >
          Join the next generation of storytellers today.
        </p>

        <Link
          href="/studio/video-agent-beta"
          className="mt-8 inline-flex items-center text-white font-medium transition-opacity hover:opacity-90"
          style={{
            fontSize: 18,
            borderRadius: 999,
            padding: "16px 40px",
            background: "linear-gradient(90deg, #22d3ee 0%, #7c3aed 100%)",
          }}
        >
          Get Started with VidFab for Free →
        </Link>
      </div>
    </section>
  )
}

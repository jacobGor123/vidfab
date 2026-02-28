import Image from "next/image"

const CARDS = [
  {
    iconSrc: "/images/icons/feature-icon-1.svg",
    title: "Produce Episodes 10x Faster",
    normalText:
      "Don't let editing burn you out. Our AI story-to-video workflow handles the heavy lifting, ",
    boldText: "turning days of work into minutes of creativity.",
    borderGradient:
      "linear-gradient(225deg, rgba(67,79,237,1) 0%, rgba(67,79,237,0.22) 49%, rgba(67,79,237,1) 100%)",
    glowColor: "rgba(67,79,237,0.55)",
  },
  {
    iconSrc: "/images/icons/feature-icon-2.svg",
    title: "Studio Quality, Solo Budget",
    normalText:
      "Replace expensive freelancers and bloated toolstacks. VidFab is your writer, illustrator, and editor—all in one browser tab.",
    boldText: null,
    borderGradient:
      "linear-gradient(225deg, rgba(76,195,255,1) 0%, rgba(76,195,255,0.22) 49%, rgba(76,195,255,1) 100%)",
    glowColor: "rgba(76,195,255,0.45)",
  },
  {
    iconSrc: "/images/icons/feature-icon-3.svg",
    title: "Excellent Character Consistency",
    normalText:
      "Build a recognizable universe. Our engine ensures your characters and visual style remain identical across ",
    boldText: "every single episode of your series.",
    borderGradient:
      "linear-gradient(225deg, rgba(124,67,237,1) 0%, rgba(124,67,237,0.22) 49%, rgba(124,67,237,1) 100%)",
    glowColor: "rgba(124,67,237,0.55)",
  },
]

export function HeroFeatureCards() {
  return (
    <section className="relative z-10 px-4 pt-14 pb-16" style={{ backgroundColor: "#0A0A12" }}>
      <div className="container mx-auto">
        {/* 区块标题 — 40px 700，"One-Person" 渐变紫→蓝 */}
        <h2
          className="font-bold text-center text-white mb-10 mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3 }}
        >
          Empowering the{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgb(123,92,255) 0%, rgb(76,195,255) 100%)",
            }}
          >
            One-Person
          </span>{" "}
          Production Team
        </h2>

        {/* 3 列卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
            style={{ borderRadius: 16 }}
          >
          <div
            className="relative overflow-hidden h-full"
            style={{
              background: `linear-gradient(black, black) padding-box, ${card.borderGradient} border-box`,
              border: "2px solid transparent",
              borderRadius: 16,
              padding: "32px 21px 28px",
            }}
          >
            {/* 底部辉光 */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
              style={{
                height: 120,
                background: `radial-gradient(ellipse 90% 100% at 50% 100%, ${card.glowColor}, transparent)`,
              }}
            />

            {/* 图标（Figma 导出含背景框） */}
            <Image
              src={card.iconSrc}
              alt=""
              width={48}
              height={48}
              className="mb-4"
              unoptimized
            />

            {/* 标题 */}
            <h3
              className="text-white font-semibold mb-3"
              style={{ fontSize: 20, lineHeight: 1.3 }}
            >
              {card.title}
            </h3>

            {/* 描述（含局部 SemiBold） */}
            <p
              className="font-normal"
              style={{ fontSize: 16, lineHeight: 1.7, color: "rgb(236,238,253)" }}
            >
              {card.normalText}
              {card.boldText && (
                <span className="font-semibold">{card.boldText}</span>
              )}
            </p>
          </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  )
}

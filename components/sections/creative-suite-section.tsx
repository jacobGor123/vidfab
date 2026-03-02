import Image from "next/image"
import Link from "next/link"

// 来自 Figma API：
//   card fill: #24223E  strokeWeight=2  strokeAlign=INSIDE  cornerRadius=16
//   stroke stops: #6650E0(0%) → #3D3B5E(54.8%) → #4882FF(100%)  direction≈225deg
const CARD_BG = "#24223E"
const CARD_BORDER_GRADIENT =
  "linear-gradient(225deg, #6650E0 0%, #3D3B5E 55%, #4882FF 100%)"

// 顶行 3 张卡片（410×484px）
const TOP_CARDS = [
  {
    id: "text-to-video",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/creative-suite-text-to-video.webp",
    title: "Text to Video",
    badge: "Prompt to Motion",
    description:
      "The industry-leading engine for generating high-fidelity cinematic clips from simple text descriptions.",
    ctaText: "Try Text-to-Video",
    ctaLink: "/studio/text-to-video",
  },
  {
    id: "image-to-video",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/creative-suite-image-to-video.webp",
    title: "Image to Video",
    badge: "Animate Your Art",
    description:
      "Bring your character designs and concept stills to life with professional, fluid motion.",
    ctaText: "Try Image-to-Video",
    ctaLink: "/studio/image-to-video",
  },
  {
    id: "text-to-image",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/creative-suite-text-to-image.webp",
    title: "Text to Image",
    badge: "Concept Creation",
    description:
      "Generate consistent characters, stunning backgrounds, and unique assets from scratch in seconds.",
    ctaText: "Try Text-to-Image",
    ctaLink: "/studio/text-to-image",
  },
]

// 底行 2 张卡片（622×500px，更宽）
const BOTTOM_CARDS = [
  {
    id: "image-to-image",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/creative-suite-image-to-image.webp",
    title: "Image to Image",
    badge: "Style Transformation",
    description:
      "Reimagine your assets, swap visual styles, or transform rough sketches into polished masterpieces.",
    ctaText: "Try Image-to-Image",
    ctaLink: "/studio/image-to-image",
  },
  {
    id: "video-effects",
    image: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/creative-suite-video-effects.webp",
    title: "AI Video Effects",
    badge: "One-Click Magic",
    description:
      "Elevate your footage with trending AI visual effects. Apply cinematic filters and surreal transformations in a single click.",
    ctaText: "Try AI Video Effects",
    ctaLink: "/studio/ai-video-effects",
  },
]

function Card({
  card,
  imageHeight,
  imageSizes,
}: {
  card: { id: string; image: string; title: string; badge: string; description: string; ctaText: string; ctaLink: string }
  imageHeight: number
  imageSizes: string
}) {
  return (
    <div
      className="h-full flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.6)]"
      style={{
        position: "relative",
        borderRadius: 16,
        backgroundColor: CARD_BG,
        overflow: "hidden",
      }}
    >
      {/* strokeAlign=INSIDE 渐变边框 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, borderRadius: 16,
          border: "2px solid transparent",
          background: `${CARD_BORDER_GRADIENT} border-box`,
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* 顶部产品截图 */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
      >
        {/* 顶部蓝紫色光晕 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 pointer-events-none z-10"
          style={{
            height: 60,
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(64,73,226,0.55) 0%, transparent 100%)",
          }}
        />
        <Image
          src={card.image}
          alt={card.title}
          width={800}
          height={imageHeight}
          sizes={imageSizes}
          style={{
            width: "calc(100% - 40px)",
            height: 'auto',
            objectFit: "cover",
            display: "block",
            marginTop: 20,
            marginLeft: 20,
            marginRight: 20,
          }}
          unoptimized
        />
      </div>

      {/* 内容区 */}
      <div className="flex flex-col flex-1 p-6">
          {/* 标题 + Badge */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3
              className="text-white font-semibold"
              style={{ fontSize: 18, lineHeight: 1.3 }}
            >
              {card.title}
            </h3>
            <span
              className="text-white font-normal"
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 100,
                backgroundColor: "rgba(255,255,255,0.12)",
                whiteSpace: "nowrap",
              }}
            >
              {card.badge}
            </span>
          </div>

          {/* 描述 */}
          <p
            className="font-normal flex-1"
            style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(235,238,252,0.8)" }}
          >
            {card.description}
          </p>

          {/* CTA 按钮 */}
          <Link
            href={card.ctaLink}
            className="inline-flex items-center self-start mt-4 text-white font-medium transition-opacity hover:opacity-85"
            style={{
              fontSize: 14,
              borderRadius: 100,
              padding: "10px 20px",
              background:
                "linear-gradient(90deg, rgb(76,195,255) 0%, rgb(123,92,255) 100%)",
              boxShadow: "0 4px 20px rgba(115,108,255,0.35)",
            }}
          >
            {card.ctaText} →
          </Link>
        </div>
    </div>
  )
}

export function CreativeSuiteSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: "#000000",
        paddingTop: 64,
        paddingBottom: 64,
      }}
    >
      {/* 背景渐变光晕 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 75% 65% at 15% 45%, rgba(64,73,226,0.50) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 55% at 85% 55%, rgba(102,81,224,0.45) 0%, transparent 65%)",
            "radial-gradient(ellipse 50% 40% at 50% 10%, rgba(31,29,76,0.60) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* 顶部与 WorkspaceSection 的过渡遮罩 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 120,
          background: "linear-gradient(to bottom, #000000 0%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* 区块标题 */}
        <h2
          className="font-bold text-center text-white mb-16 mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3, maxWidth: 720 }}
        >
          The Creative Suite
        </h2>

        {/* 顶行：3 张等宽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-stretch">
          {TOP_CARDS.map((card) => (
            <Card key={card.id} card={card} imageHeight={220} imageSizes="(max-width: 768px) 100vw, 33vw" />
          ))}
        </div>

        {/* 底行：2 张等宽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {BOTTOM_CARDS.map((card) => (
            <Card key={card.id} card={card} imageHeight={260} imageSizes="(max-width: 768px) 100vw, 50vw" />
          ))}
        </div>
      </div>
    </section>
  )
}

import Image from "next/image"

// 动画 CSS 直接内嵌，确保 keyframe 100% 注入 DOM
const CARD_CSS = `
  @keyframes hfc-left-large   { 0%,100%{transform:rotate(-0.3deg) translateY(0)}  50%{transform:rotate(-0.3deg) translateY(-12px)} }
  @keyframes hfc-left-medium  { 0%,100%{transform:rotate(0.3deg)  translateY(0)}  50%{transform:rotate(0.3deg)  translateY(-8px)}  }
  @keyframes hfc-left-small   { 0%,100%{transform:rotate(-0.3deg) translateY(0)}  50%{transform:rotate(-0.3deg) translateY(-12px)} }
  @keyframes hfc-right-large  { 0%,100%{transform:rotate(-2.9deg) translateY(0)}  50%{transform:rotate(-2.9deg) translateY(-8px)}  }
  @keyframes hfc-right-medium { 0%,100%{transform:rotate(2.8deg)  translateY(0)}  50%{transform:rotate(2.8deg)  translateY(-12px)} }
  @keyframes hfc-right-small  { 0%,100%{transform:rotate(-2.8deg) translateY(0)}  50%{transform:rotate(-2.8deg) translateY(-8px)}  }

  .hfc-left-large   { animation: hfc-left-large   6s ease-in-out 0s    infinite both; }
  .hfc-left-medium  { animation: hfc-left-medium  4s ease-in-out 0.7s  infinite both; }
  .hfc-left-small   { animation: hfc-left-small   6s ease-in-out 1.4s  infinite both; }
  .hfc-right-large  { animation: hfc-right-large  4s ease-in-out 0.35s infinite both; }
  .hfc-right-medium { animation: hfc-right-medium 6s ease-in-out 1.05s infinite both; }
  .hfc-right-small  { animation: hfc-right-small  4s ease-in-out 1.75s infinite both; }
`

const CARDS = [
  {
    id: "left-large",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-left-large.webp",
    size: 228,
    left: "8.9%", top: "16.8%", opacity: 1,
    cls: "hfc-left-large",
  },
  {
    id: "left-medium",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-left-medium.webp",
    size: 193,
    left: "8.9%", top: "44.8%", opacity: 0.8,
    cls: "hfc-left-medium",
  },
  {
    id: "left-small",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-left-small.webp",
    size: 154,
    left: "17.6%", top: "67%", opacity: 0.7,
    cls: "hfc-left-small",
  },
  {
    id: "right-large",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-right-large.webp",
    size: 228,
    right: "8.4%", top: "14.7%", opacity: 1,
    cls: "hfc-right-large",
  },
  {
    id: "right-medium",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-right-medium.webp",
    size: 193,
    right: "9.4%", top: "46%", opacity: 0.8,
    cls: "hfc-right-medium",
  },
  {
    id: "right-small",
    src: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/hero-card-right-small.webp",
    size: 154,
    right: "17.6%", top: "70.4%", opacity: 0.7,
    cls: "hfc-right-small",
  },
]

export function HeroFloatingCards() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CARD_CSS }} />

      {CARDS.map((card) => (
        // 单层 div：图片即视觉，无独立 CSS 边框，旋转/动画/图片永远同一 transform，不可能不一致
        <div
          key={card.id}
          className={`absolute hidden lg:block ${card.cls}`}
          style={{
            left: (card as { left?: string }).left,
            right: (card as { right?: string }).right,
            top: card.top,
            width: card.size,
            height: card.size,
            opacity: card.opacity,
            // PNG 本身已含边框+圆角，无需 CSS 额外裁剪
          }}
        >
          <Image
            src={card.src}
            alt="AI video generation showcase"
            width={card.size}
            height={card.size}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      ))}
    </>
  )
}

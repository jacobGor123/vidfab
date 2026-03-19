import Image from "next/image"
import { Link } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"

const CARD_BG = "#0D0930"
const CARD_BORDER = "rgb(92,95,130)"
const BASE_URL = "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets"

const CARD_META = [
  {
    id: "outliner",
    img: `${BASE_URL}/script-card-outliner-v2.webp`,
    alt: "Outliner – AI script generation from rough ideas",
  },
  {
    id: "curator",
    img: `${BASE_URL}/script-card-curator-v2.webp`,
    alt: "Curator – analyze a YouTube video and generate a viral script",
  },
  {
    id: "spark",
    img: `${BASE_URL}/script-card-spark-v2.webp`,
    alt: "Spark – AI script inspirations and episodic concept generator",
  },
]

export async function ScriptSection() {
  const t = await getTranslations('home')
  const cards = t.raw('script.cards') as Array<{ title: string; description: string }>

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

      {/* 底部渐变遮罩 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: 160,
          background: "linear-gradient(to bottom, transparent 0%, #000000 100%)",
        }}
      />

      {/* 顶部柔化遮罩 */}
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
          {t('script.title')}
        </h2>

        {/* 副标题 */}
        <p
          className="text-center font-normal mb-12 mx-auto"
          style={{ fontSize: 16, lineHeight: 1.8, color: "rgb(236,238,253)", maxWidth: 758 }}
        >
          {t('script.subtitle')}
        </p>

        {/* 3 列卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {CARD_META.map((meta, i) => (
            <div
              key={meta.id}
              className="transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 16,
                border: `1px solid ${CARD_BORDER}`,
                backgroundColor: CARD_BG,
                overflow: "hidden",
              }}
            >
              {/* 文字区 */}
              <div style={{ padding: "27px 21px" }}>
                <h3
                  className="text-white font-semibold mb-3"
                  style={{ fontSize: 20, lineHeight: 1.3 }}
                >
                  {cards[i].title}
                </h3>
                <p
                  className="font-normal"
                  style={{ fontSize: 16, lineHeight: 1.65, color: "rgb(236,238,253)" }}
                >
                  {cards[i].description}
                </p>
              </div>

              {/* 图片：贴底铺满 */}
              <div style={{ marginTop: "auto" }}>
                <Image
                  src={meta.img}
                  alt={meta.alt}
                  width={410}
                  height={269}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ width: "100%", height: "auto", display: "block" }}
                  unoptimized
                />
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
            {t('script.cta')}
          </Link>
        </div>
      </div>
    </section>
  )
}

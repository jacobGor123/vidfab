import { MonitorSmartphone, Clock, SlidersHorizontal, Tv } from "lucide-react"
import { getTranslations } from "next-intl/server"

const ICONS = [MonitorSmartphone, Clock, SlidersHorizontal, Tv]

export async function EngineeredSection() {
  const t = await getTranslations('home')
  const items = t.raw('engineered.items') as Array<{ title: string; description: string }>

  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: "#0A0A12",
        paddingTop: 64,
        paddingBottom: 64,
      }}
    >
      {/* 背景色球 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 70% 80% at 15% 50%, rgba(123,51,199,0.32) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 70% at 85% 50%, rgba(50,83,212,0.28) 0%, transparent 65%)",
          ].join(", "),
        }}
      />

      {/* 顶部过渡：从 CreativeSuiteSection 的 #000000 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 100,
          background: "linear-gradient(to bottom, #000000 0%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* 标题 */}
        <h2
          className="font-bold text-center text-white mb-4 mx-auto text-[24px] sm:text-[32px] lg:text-[40px]"
          style={{ lineHeight: 1.3, maxWidth: 720 }}
        >
          {t('engineered.title')}
        </h2>

        {/* 副标题 */}
        <p
          className="text-center font-normal mb-12 mx-auto"
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 680,
          }}
        >
          {t('engineered.subtitle')}
        </p>

        {/* 2x2 卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, i) => {
            const Icon = ICONS[i]
            return (
              <div
                key={i}
                className="transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_26px_10px_rgba(40,51,170,0.28)]"
                style={{ borderRadius: 16 }}
              >
                <div
                  className="relative flex flex-col md:flex-row md:items-start gap-5 overflow-hidden"
                  style={{
                    backgroundColor: "#161640",
                    borderRadius: 16,
                    padding: "24px 28px",
                    border: "1px solid rgb(92,95,130)",
                  }}
                >
                  {/* 卡片内椭圆光晕 */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                    style={{
                      left: 60,
                      top: -10,
                      width: 514,
                      height: 103,
                      borderRadius: "50%",
                      backgroundColor: "rgba(52,52,112,0.55)",
                      filter: "blur(24px)",
                    }}
                  />

                  {/* Icon 容器 */}
                  <div
                    className="relative z-10 flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 89,
                      height: 89,
                      backgroundColor: "#2F2F68",
                      borderRadius: 16,
                    }}
                  >
                    <Icon size={36} color="#A1A1FF" strokeWidth={1.5} />
                  </div>

                  {/* 文字区 */}
                  <div className="relative z-10 flex flex-col justify-center" style={{ paddingTop: 6 }}>
                    <h3
                      className="text-white font-semibold mb-2"
                      style={{ fontSize: 20, lineHeight: 1.3 }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="font-normal"
                      style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

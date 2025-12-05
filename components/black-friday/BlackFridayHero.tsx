"use client"

const CDN_BASE = 'https://static.vidfab.ai/public/activity/black-friday-sale-2025'
const HERO_BG_URL = `${CDN_BASE}/hero-bg.webp`
const HERO_BG_MB_URL = `${CDN_BASE}/hero-bg-mb.webp`

export function BlackFridayHero() {
  const scrollToPlans = () => {
    const plansSection = document.getElementById('monthly-plans')
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="relative w-full overflow-hidden">
      {/* 桌面版背景 */}
      <div className="hidden md:block relative w-full">
        <div
          className="w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${HERO_BG_URL})`,
            aspectRatio: '1920 / 800',
          }}
        >
          {/* 按钮 */}
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={scrollToPlans}
              className="absolute left-1/2 transform -translate-x-1/2 px-12 py-4 text-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center gap-3"
              style={{
                top: '68%',
              }}
              aria-label="Don't Miss Out - Scroll to pricing plans"
            >
              Don't Miss Out
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 移动版背景 */}
      <div className="md:hidden relative w-full">
        <div className="relative w-full" style={{ paddingBottom: '120%' }}>
          {/* 背景图片 */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${HERO_BG_MB_URL})`,
            }}
          >
            {/* 按钮 */}
            <button
              onClick={scrollToPlans}
              className="absolute left-1/2 transform -translate-x-1/2 px-8 py-3 text-base font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
              style={{
                top: '58%',
              }}
              aria-label="Don't Miss Out - Scroll to pricing plans"
            >
              Don't Miss Out
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

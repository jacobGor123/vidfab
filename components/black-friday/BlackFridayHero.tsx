"use client"

import { Button } from '@/components/ui/button'

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
      {/* 桌面端 Hero 背景图片 */}
      <div
        className="relative w-full hidden md:block"
        style={{
          aspectRatio: '1920 / 800',
          backgroundImage: `url(${HERO_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 按钮定位容器 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute" style={{ top: '68%', left: '50%', transform: 'translateX(-50%)' }}>
            <Button
              onClick={scrollToPlans}
              size="lg"
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-2xl shadow-pink-500/50 transition-all duration-300 hover:scale-105 hover:shadow-pink-500/70"
            >
              Don't Miss Out
              <span className="ml-2 text-xl">+</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 移动端 Hero 背景图片 */}
      <div
        className="relative w-full md:hidden"
        style={{
          aspectRatio: '750 / 900',
          backgroundImage: `url(${HERO_BG_MB_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 按钮定位容器 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute" style={{ top: '52%', left: '50%', transform: 'translateX(-50%)' }}>
            <Button
              onClick={scrollToPlans}
              size="lg"
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] hover:opacity-90 text-white px-6 py-5 text-base font-semibold rounded-full shadow-2xl shadow-pink-500/50 transition-all duration-300 hover:scale-105 hover:shadow-pink-500/70"
            >
              Don't Miss Out
              <span className="ml-2 text-lg">+</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { Button } from '@/components/ui/button'
import { BlackFridayCountdown } from './BlackFridayCountdown'
import { SpaceBackground } from '@/components/space-background'
import { ArrowDown } from 'lucide-react'

export function BlackFridayHero() {
  const scrollToPlans = () => {
    const plansSection = document.getElementById('monthly-plans')
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32">
      <SpaceBackground />

      {/* 黑五主题装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 金色渐变光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* 黑五标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-sm font-semibold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              BLACK FRIDAY SALE 2025
            </span>
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="block mb-4">Unleash the</span>
            <span className="block bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              Black Friday Magic
            </span>
          </h1>

          {/* 副标题 */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Save up to{' '}
            <span className="font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              20% OFF
            </span>{' '}
            on all AI video creation plans
          </p>

          {/* 倒计时 */}
          <div className="py-8">
            <p className="text-sm text-gray-400 mb-4 uppercase tracking-wider">
              Sale Ends In
            </p>
            <BlackFridayCountdown />
          </div>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={scrollToPlans}
              size="lg"
              className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-2xl shadow-orange-500/50 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/70"
            >
              Don't Miss Out
              <ArrowDown className="ml-2 h-5 w-5 animate-bounce" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { isBlackFridayActive } from '@/lib/black-friday/coupons'
import { cn } from '@/lib/utils'

const BANNER_STORAGE_KEY = 'bf2025_banner_dismissed'

export function BlackFridayBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // 检查黑五活动是否进行中
    if (!isBlackFridayActive()) {
      return
    }

    // 检查横幅是否已被关闭
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY)
    if (dismissed !== 'true') {
      setIsVisible(true)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem(BANNER_STORAGE_KEY, 'true')
  }

  if (!mounted || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-black via-gray-900 to-black border-b border-orange-500/30">
      <Link href="/black-friday-sale-2025" className="block">
        <div className="container mx-auto px-4 py-3 relative">
          {/* 横幅内容 */}
          <div className="flex items-center justify-center gap-4">
            {/* 闪烁点 */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>

            {/* 文字内容 */}
            <p className="text-sm md:text-base font-bold text-center">
              <span className="text-white">BLACK FRIDAY SALE -</span>{' '}
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                UP TO 20% OFF!
              </span>{' '}
              <span className="text-white hidden sm:inline">GET IT NOW!</span>
            </p>

            {/* 闪烁点 */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleClose()
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Link>
    </div>
  )
}

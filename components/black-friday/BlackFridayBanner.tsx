"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import Link from 'next/link'

const BANNER_STORAGE_KEY = 'bf2025_banner_dismissed'
const CDN_BASE = 'https://static.vidfab.ai/public/activity/black-friday-sale-2025'

export function BlackFridayBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // 黑五页面不显示横幅
  const isBlackFridayPage = pathname === '/black-friday-sale-2025'

  useEffect(() => {
    setMounted(true)

    // 黑五页面不显示横幅
    if (isBlackFridayPage) {
      setIsVisible(false)
      return
    }

    // 检查横幅是否已被关闭
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY)
    if (dismissed !== 'true') {
      setIsVisible(true)
    }
  }, [isBlackFridayPage])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem(BANNER_STORAGE_KEY, 'true')
  }

  if (!mounted || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-black">
      <Link href="/black-friday-sale-2025" className="block relative">
        {/* 桌面端横幅图片 */}
        <img
          src={`${CDN_BASE}/layout-top-banner.png`}
          alt="Black Friday Sale - Up to 20% OFF"
          className="w-full h-auto hidden md:block"
        />
        {/* 移动端横幅图片 */}
        <img
          src={`${CDN_BASE}/layout-top-banner-mb.png`}
          alt="Black Friday Sale - Up to 20% OFF"
          className="w-full h-auto md:hidden"
        />
        {/* 关闭按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleClose()
          }}
          className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors bg-black/50 rounded-full p-1"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </Link>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isBlackFridayActive } from '@/lib/black-friday/coupons'

const BANNER_STORAGE_KEY = 'bf2025_banner_dismissed'
const CDN_BASE = 'https://static.vidfab.ai/public/activity/black-friday-sale-2025'

export function BlackFridayBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // 如果是黑五页面，直接不渲染
  const isBlackFridayPage = pathname === '/black-friday-sale-2025'

  useEffect(() => {
    setMounted(true)

    // 如果是黑五页面，不显示横幅
    if (isBlackFridayPage) {
      setIsVisible(false)
      return
    }

    // 检查黑五活动是否进行中
    if (!isBlackFridayActive()) {
      setIsVisible(false)
      return
    }

    // 检查横幅是否已被关闭
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY)
    if (dismissed !== 'true') {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [pathname, isBlackFridayPage])

  // 动态设置CSS变量来存储横幅高度
  useEffect(() => {
    if (!isVisible || !bannerRef.current) {
      document.documentElement.style.setProperty('--bf-banner-height', '0px')
      return
    }

    const updateBannerHeight = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.offsetHeight
        document.documentElement.style.setProperty('--bf-banner-height', `${height}px`)
      }
    }

    // 初始设置
    updateBannerHeight()

    // 监听窗口大小变化
    window.addEventListener('resize', updateBannerHeight)

    // 监听图片加载完成
    const images = bannerRef.current.querySelectorAll('img')
    images.forEach(img => {
      if (img.complete) {
        updateBannerHeight()
      } else {
        img.addEventListener('load', updateBannerHeight)
      }
    })

    return () => {
      window.removeEventListener('resize', updateBannerHeight)
      images.forEach(img => {
        img.removeEventListener('load', updateBannerHeight)
      })
    }
  }, [isVisible])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem(BANNER_STORAGE_KEY, 'true')
    // 关闭时也要更新高度
    document.documentElement.style.setProperty('--bf-banner-height', '0px')
  }

  // 如果是黑五页面，直接不渲染任何内容
  if (!mounted || !isVisible || isBlackFridayPage) {
    return null
  }

  return (
    <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-[100] bg-black">
      <Link href="/black-friday-sale-2025" className="block relative">
        {/* 桌面版横幅图片 */}
        <img
          src={`${CDN_BASE}/layout-top-banner.png`}
          alt="Black Friday Sale - Up to 20% OFF"
          className="w-full h-auto hidden md:block"
        />

        {/* 移动版横幅图片 */}
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
          className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </Link>
    </div>
  )
}

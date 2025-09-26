"use client"

import { useState, useEffect } from 'react'
import { VIDEO_HERO_CONFIG } from '../config/video-hero.config'

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const userAgent = navigator.userAgent
      
      const isMobileByWidth = width < VIDEO_HERO_CONFIG.mobileBreakpoint
      const isMobileByUserAgent = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent)
      
      return isMobileByWidth || isMobileByUserAgent
    }

    const updateMobileStatus = () => {
      setIsMobile(checkMobile())
      setIsLoading(false)
    }

    updateMobileStatus()

    const handleResize = () => {
      updateMobileStatus()
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    isMobile,
    isDesktop: !isMobile,
    isLoading
  }
}
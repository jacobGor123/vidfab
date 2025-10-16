"use client"

import { useState, useEffect } from 'react'
import type { NetworkInfo, VideoLoadingStrategy } from '../types/video-hero.types'
import { LOADING_STRATEGIES } from '../config/video-hero.config'

export const useNetworkAware = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ type: 'unknown' })
  const [loadingStrategy, setLoadingStrategy] = useState<VideoLoadingStrategy>(
    LOADING_STRATEGIES.unknown
  )

  useEffect(() => {
    const updateNetworkInfo = () => {
      // @ts-ignore - Navigator connection API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

      if (connection) {
        const info: NetworkInfo = {
          type: connection.effectiveType || 'unknown',
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
          saveData: connection.saveData
        }

        setNetworkInfo(info)
        setLoadingStrategy(LOADING_STRATEGIES[info.type] || LOADING_STRATEGIES.unknown)
      } else {
        setNetworkInfo({ type: 'unknown' })
        setLoadingStrategy(LOADING_STRATEGIES.unknown)
      }
    }

    updateNetworkInfo()

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const shouldPreloadVideos = () => {
    return loadingStrategy.preloadAll || networkInfo.type === '4g' || networkInfo.type === 'unknown'
  }

  const getMaxConcurrentLoads = () => {
    return loadingStrategy.maxConcurrent
  }

  const shouldShowVideoBackground = () => {
    // 省流量模式下不显示视频背景
    if (networkInfo.saveData) return false
    // 慢速连接不显示视频背景
    if (loadingStrategy.type === 'poster-only') return false
    // 3G 及以下网络不显示视频背景
    if (['slow-2g', '2g', '3g'].includes(networkInfo.type || '')) return false
    return true
  }

  const isSlowConnection = () => {
    return networkInfo.saveData ||
           ['slow-2g', '2g', '3g'].includes(networkInfo.type || '')
  }

  return {
    networkInfo,
    loadingStrategy,
    shouldPreloadVideos: shouldPreloadVideos(),
    maxConcurrentLoads: getMaxConcurrentLoads(),
    shouldShowVideoBackground: shouldShowVideoBackground(),
    isSlowConnection: isSlowConnection()
  }
}
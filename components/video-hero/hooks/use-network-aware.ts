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

    // 如果检测不到网络信息,默认信任并显示视频(兼容指纹浏览器等特殊环境)
    if (!networkInfo.type || networkInfo.type === 'unknown') return true

    // 只屏蔽 2G 及以下网络,允许 3G 及以上(2025年 3G 已足够播放视频)
    if (['slow-2g', '2g'].includes(networkInfo.type)) return false
    return true
  }

  const isSlowConnection = () => {
    return networkInfo.saveData ||
           ['slow-2g', '2g'].includes(networkInfo.type || '')
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
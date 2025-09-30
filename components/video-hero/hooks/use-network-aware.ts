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
    return loadingStrategy.type !== 'poster-only'
  }

  return {
    networkInfo,
    loadingStrategy,
    shouldPreloadVideos: shouldPreloadVideos(),
    maxConcurrentLoads: getMaxConcurrentLoads(),
    shouldShowVideoBackground: shouldShowVideoBackground(),
    isSlowConnection: networkInfo.type === 'slow-2g' || networkInfo.type === '2g'
  }
}
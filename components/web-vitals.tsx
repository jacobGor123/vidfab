"use client"

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'

/**
 * Web Vitals 性能监控组件
 *
 * 监控并上报 Core Web Vitals 指标:
 * - CLS (Cumulative Layout Shift): 累积布局偏移
 * - FID (First Input Delay): 首次输入延迟
 * - FCP (First Contentful Paint): 首次内容绘制
 * - LCP (Largest Contentful Paint): 最大内容绘制
 * - TTFB (Time to First Byte): 首字节时间
 * - INP (Interaction to Next Paint): 交互到下次绘制
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // 性能指标阈值判断
    const getPerformanceRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
      const thresholds: Record<string, { good: number; needsImprovement: number }> = {
        CLS: { good: 0.1, needsImprovement: 0.25 },
        FID: { good: 100, needsImprovement: 300 },
        FCP: { good: 1800, needsImprovement: 3000 },
        LCP: { good: 2500, needsImprovement: 4000 },
        TTFB: { good: 800, needsImprovement: 1800 },
        INP: { good: 200, needsImprovement: 500 },
      }

      const threshold = thresholds[name]
      if (!threshold) return 'good'

      if (value <= threshold.good) return 'good'
      if (value <= threshold.needsImprovement) return 'needs-improvement'
      return 'poor'
    }

    const rating = getPerformanceRating(metric.name, metric.value)

    // 控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
      console.log(
        `${emoji} Web Vital - ${metric.name}:`,
        Math.round(metric.value),
        `(${rating})`,
        metric
      )
    }

    // 发送到 Google Analytics (如果已配置)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }

    // 发送到自定义分析端点 (可选)
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      })

      // 使用 sendBeacon 确保在页面卸载时也能发送
      if (navigator.sendBeacon) {
        navigator.sendBeacon(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, body)
      } else {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(console.error)
      }
    }
  })

  // 额外监控：页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📊 Page hidden at:', new Date().toISOString())
      } else {
        console.log('📊 Page visible at:', new Date().toISOString())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return null
}

// TypeScript 类型扩展
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

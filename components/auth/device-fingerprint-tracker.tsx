'use client'

/**
 * 设备指纹追踪器 - Layer 3 防欺诈
 * 在用户登录后任意页面触发一次，检测是否为重复设备
 */
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_KEY_PREFIX = 'vf_device_check_done'

export function DeviceFingerprintTracker() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.uuid) return
    if (typeof window === 'undefined') return

    const storageKey = `${STORAGE_KEY_PREFIX}_${session.user.uuid}`
    if (localStorage.getItem(storageKey)) return // 已完成，跳过

    let cancelled = false

    async function runCheck() {
      try {
        const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
        if (cancelled) return

        const fp = await FingerprintJS.load()
        if (cancelled) return

        const result = await fp.get()
        if (cancelled) return

        await fetch('/api/user/device-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprintHash: result.visitorId }),
        })

        if (!cancelled) {
          localStorage.setItem(storageKey, '1')
        }
      } catch (err) {
        // 静默失败，不影响用户体验
        console.debug('[DeviceFingerprintTracker] 指纹检测失败:', err)
      }
    }

    runCheck()
    return () => { cancelled = true }
  }, [status, session?.user?.uuid])

  return null // 无渲染内容
}

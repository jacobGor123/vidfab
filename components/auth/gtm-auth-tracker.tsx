"use client"

/**
 * GtmAuthTracker
 * 专门处理 Google OAuth 登录后的 GTM sign_up 事件跟踪。
 * Email 登录的跟踪在 unified-auth-modal.tsx 里完成，这里只处理 Google。
 *
 * 用 localStorage 做幂等保护，确保每个用户账号只触发一次 sign_up。
 */

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { trackSignUp } from "@/lib/analytics/gtm"

export function GtmAuthTracker() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.uuid) return

    // 只处理 Google 登录（Email 登录已在 unified-auth-modal 里跟踪）
    const provider = session.user.signinProvider
    if (!provider?.includes("google")) return

    // 不是新用户，无需触发 sign_up
    if (!session.user.isNewUser) return

    // localStorage 幂等保护：每个账号只触发一次
    const storageKey = `gtm_signup_tracked_${session.user.uuid}`
    if (localStorage.getItem(storageKey)) return

    localStorage.setItem(storageKey, "1")
    trackSignUp("google", session.user.uuid)
  }, [session])

  return null
}

/**
 * ExpiresChip — 显示 Free 用户资产剩余可用时间
 *
 * 规则（与 lib/storage/unified-storage-manager.ts:FREE_USER_RETENTION_HOURS 对齐）：
 *   - 仅在 isPro=false 且 status='completed' 时显示
 *   - 资产 updated_at 之后 24 小时为有效期
 *   - 剩余 ≤ 6h：橙红警告 + 闪动
 *   - 剩余 > 6h：中性灰
 *   - 已过期：不显示（卡片本应被后台清理）
 *   - 旁挂 "Upgrade to keep →" link → /pricing
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Clock } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { defaultLocale } from '@/i18n/locale'
import { cn } from '@/lib/utils'

const RETENTION_HOURS = 24
const WARNING_THRESHOLD_HOURS = 6

interface ExpiresChipProps {
  /** 资产完成时间（updated_at） */
  updatedAt: string
  /** 仅当 status='completed' 时调用方应渲染本组件 */
  status: string
  /** 订阅用户不显示 */
  isPro: boolean
}

export function ExpiresChip({ updatedAt, status, isPro }: ExpiresChipProps) {
  const t = useTranslations('studio.myAssets')
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`

  // 每分钟 tick 一次刷新剩余时间显示
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (isPro || status !== 'completed') return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [isPro, status])

  const remainingMs = useMemo(() => {
    const completedAt = new Date(updatedAt).getTime()
    const expiresAt = completedAt + RETENTION_HOURS * 3_600_000
    return expiresAt - now
  }, [updatedAt, now])

  // Pro 用户 / 非 completed / 已过期 → 不渲染
  if (isPro || status !== 'completed' || remainingMs <= 0) {
    return null
  }

  const remainingHours = remainingMs / 3_600_000
  const isWarning = remainingHours <= WARNING_THRESHOLD_HOURS
  const label = formatRemaining(remainingMs, t)

  return (
    <div
      className={cn(
        'flex flex-col gap-1 items-start pointer-events-auto',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
          'backdrop-blur-sm border',
          isWarning
            ? 'bg-red-600/70 border-red-400/50 text-white animate-pulse'
            : 'bg-black/55 border-white/15 text-white/90'
        )}
        title={t('expiresIn', { time: label })}
      >
        <Clock className="w-2.5 h-2.5" />
        <span>{t('expiresIn', { time: label })}</span>
      </span>
      <Link
        href={`${localePrefix}/pricing` as any}
        onClick={(e) => e.stopPropagation()}
        className="px-2 py-0.5 rounded-full text-[10px] font-medium
                   bg-white/85 hover:bg-white text-black/85 hover:text-black
                   transition-colors"
      >
        {t('upgradeToKeep')}
      </Link>
    </div>
  )
}

/** 把毫秒数格式化为 `23h` / `5h` / `59m` */
function formatRemaining(ms: number, t: ReturnType<typeof useTranslations>) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000))
  if (totalMinutes >= 60) {
    return `${Math.floor(totalMinutes / 60)}${t('hoursShort')}`
  }
  return `${totalMinutes}${t('minutesShort')}`
}

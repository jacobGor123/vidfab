/**
 * 脚本创建配额显示组件
 * 显示用户当月剩余的免费脚本创建次数；同行右侧附「View your drafts here →」入口。
 */

"use client"

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, Info } from 'lucide-react'
import { useScriptQuota } from '@/hooks/use-script-quota'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const DRAFTS_HREF = '/studio/video-agent-beta/drafts'

export function ScriptQuotaDisplay() {
  const { quotaStatus, isLoading } = useScriptQuota()
  const { creditsRemaining } = useSimpleSubscription()

  // 未登录或加载中：整行不显示（drafts 入口对未登录用户也无意义）
  if (!quotaStatus || isLoading) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <QuotaChip quotaStatus={quotaStatus} creditsRemaining={creditsRemaining} />
      <DraftsLink />
    </div>
  )
}

interface QuotaStatusShape {
  remainingFree: number
  monthlyQuota: number
  currentUsage: number
}

function QuotaChip({
  quotaStatus,
  creditsRemaining,
}: {
  quotaStatus: QuotaStatusShape
  creditsRemaining: number
}) {
  const { remainingFree, monthlyQuota } = quotaStatus

  // 配额内
  if (remainingFree > 0) {
    return (
      <Chip variant="default">
        <span className="text-sm text-white/80">
          Remaining: <span className="font-semibold text-white">{remainingFree}/{monthlyQuota}</span> free scripts this month
        </span>
        <QuotaTooltip
          title="Script Creation Quota"
          body={
            <>
              You get <span className="text-purple-400">{monthlyQuota} free scripts</span> per month.
              After that, each script costs <span className="text-yellow-400">3 credits</span>.
            </>
          }
          footer="Quota resets on the 1st of each month."
        />
      </Chip>
    )
  }

  const hasEnoughCredits = creditsRemaining >= 3

  // 配额外但有积分
  if (hasEnoughCredits) {
    return (
      <Chip variant="warning">
        <span className="text-sm text-white/80">
          Next script: <span className="font-semibold text-yellow-300">3 credits</span>
          <span className="text-white/50 ml-1">(monthly quota used)</span>
        </span>
        <QuotaTooltip
          title="Monthly Quota Exceeded"
          body={
            <>
              You've used all <span className="text-purple-400">{monthlyQuota} free scripts</span> this month.
              Each additional script costs <span className="text-yellow-400">3 credits</span>.
            </>
          }
          footer={`Your current balance: ${creditsRemaining} credits`}
        />
      </Chip>
    )
  }

  // 配额外且积分不足
  return (
    <Chip variant="danger">
      <span className="text-sm text-white/80">
        Monthly quota exceeded · Need <span className="font-semibold text-red-300">3 credits</span>
      </span>
      <QuotaTooltip
        title="Insufficient Credits"
        body={
          <>
            You've used all <span className="text-purple-400">{monthlyQuota} free scripts</span> this month.
            Additional scripts require <span className="text-yellow-400">3 credits</span> each.
          </>
        }
        footer={`Your current balance: ${creditsRemaining} credits`}
        extra="Please purchase credits or upgrade your plan to continue."
      />
    </Chip>
  )
}

function DraftsLink() {
  const t = useTranslations('studio.storyToVideo')
  return (
    <Link
      href={DRAFTS_HREF}
      className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/30 hover:border-purple-300/50
                 text-sm font-medium text-purple-100 transition-all"
    >
      <span>{t('viewDrafts')}</span>
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

const VARIANT_CLASS: Record<'default' | 'warning' | 'danger', string> = {
  default: 'bg-white/5 border-white/20',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  danger: 'bg-red-500/10 border-red-500/30',
}

function Chip({
  variant,
  children,
}: {
  variant: 'default' | 'warning' | 'danger'
  children: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${VARIANT_CLASS[variant]}`}>
      {children}
    </div>
  )
}

function QuotaTooltip({
  title,
  body,
  footer,
  extra,
}: {
  title: string
  body: React.ReactNode
  footer: string
  extra?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-slate-900 border-white/20 text-white">
          <div className="space-y-2">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-white/70">{body}</p>
            <p className="text-xs text-white/50">{footer}</p>
            {extra && <p className="text-xs text-red-400">{extra}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

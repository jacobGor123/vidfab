/**
 * 脚本创建配额显示组件
 * 显示用户当月剩余的免费脚本创建次数
 */

"use client"

import { Info } from 'lucide-react'
import { useScriptQuota } from '@/hooks/use-script-quota'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ScriptQuotaDisplay() {
  const { quotaStatus, isLoading } = useScriptQuota()
  const { creditsRemaining } = useSimpleSubscription()

  // 未登录或加载中不显示
  if (!quotaStatus || isLoading) {
    return null
  }

  const { remainingFree, monthlyQuota, currentUsage } = quotaStatus
  const isWithinQuota = remainingFree > 0

  // 配额内显示
  if (isWithinQuota) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/20">
          <span className="text-sm text-white/80">
            Remaining: <span className="font-semibold text-white">{remainingFree}/{monthlyQuota}</span> free scripts this month
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs bg-slate-900 border-white/20 text-white"
              >
                <div className="space-y-2">
                  <p className="font-semibold">Script Creation Quota</p>
                  <p className="text-sm text-white/70">
                    You get <span className="text-purple-400">{monthlyQuota} free scripts</span> per month.
                    After that, each script costs <span className="text-yellow-400">3 credits</span>.
                  </p>
                  <p className="text-xs text-white/50">
                    Quota resets on the 1st of each month.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  // 配额外，检查积分
  const hasEnoughCredits = creditsRemaining >= 3

  if (hasEnoughCredits) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <span className="text-sm text-white/80">
            Next script: <span className="font-semibold text-yellow-300">3 credits</span>
            <span className="text-white/50 ml-1">(monthly quota used)</span>
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs bg-slate-900 border-white/20 text-white"
              >
                <div className="space-y-2">
                  <p className="font-semibold">Monthly Quota Exceeded</p>
                  <p className="text-sm text-white/70">
                    You've used all <span className="text-purple-400">{monthlyQuota} free scripts</span> this month.
                    Each additional script costs <span className="text-yellow-400">3 credits</span>.
                  </p>
                  <p className="text-xs text-white/50">
                    Your current balance: {creditsRemaining} credits
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  // 配额外且积分不足
  return (
    <div className="flex items-center gap-2 py-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
        <span className="text-sm text-white/80">
          Monthly quota exceeded · Need <span className="font-semibold text-red-300">3 credits</span>
        </span>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-slate-900 border-white/20 text-white"
            >
              <div className="space-y-2">
                <p className="font-semibold">Insufficient Credits</p>
                <p className="text-sm text-white/70">
                  You've used all <span className="text-purple-400">{monthlyQuota} free scripts</span> this month.
                  Additional scripts require <span className="text-yellow-400">3 credits</span> each.
                </p>
                <p className="text-xs text-white/50">
                  Your current balance: {creditsRemaining} credits
                </p>
                <p className="text-xs text-red-400">
                  Please purchase credits or upgrade your plan to continue.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
